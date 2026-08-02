<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="dataState"
    :data-focus-visible="focusVisible || undefined"
  >
    <div class="ui-otp-cells" aria-hidden="true">
      <span
        v-for="(cell, index) in cells"
        :key="index"
        ref="cellEls"
        :class="cellPart.class"
        :style="cellPart.style"
        :data-active="cell.active || undefined"
        :data-filled="cell.filled || undefined"
      >
        <slot
          name="cell"
          :char="cell.char"
          :index="index"
          :active="cell.active"
          :filled="cell.filled"
        >
          <span :key="`${index}-${cell.char ?? 'empty'}`" class="ui-otp-cell-char">{{
            cell.char ? (mask ? '•' : cell.char) : ''
          }}</span>
        </slot>
      </span>
    </div>
    <input
      ref="inputEl"
      :id="fieldControl.id"
      type="text"
      :class="inputPart.class"
      :style="inputPart.style"
      :value="displayValue"
      :maxlength="length"
      :inputmode="type === 'numeric' ? 'numeric' : 'text'"
      autocomplete="one-time-code"
      autocapitalize="off"
      spellcheck="false"
      :disabled="isDisabled"
      :name="name"
      :aria-describedby="fieldControl.describedBy()"
      :aria-invalid="isInvalid || undefined"
      :aria-required="fieldControl.required() || undefined"
      @input="onNativeInput"
      @focus="onNativeFocus"
      @blur="onNativeBlur"
      @pointerdown="onOverlayPointerDown"
      @keyup="updateActive"
    />
  </div>
</template>

<!-- Invisible input for caret/paste handling; cellEls keyed on index (not char) to avoid remount on content change. -->
<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  shallowRef,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import { useFieldControl } from '../composables/useFieldControl'
import { focusIsFromKeyboard } from '../composables/useFocusVisible'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const modelValue = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    length?: number
    type?: 'numeric' | 'alphanumeric'
    mask?: boolean
    disabled?: boolean
    invalid?: boolean
    size?: 'sm' | 'md' | 'lg'
    name?: string
    ui?: Partial<{ root: UiPartValue; input: UiPartValue; cell: UiPartValue }>
  }>(),
  { length: 6, type: 'numeric', mask: false, disabled: false, invalid: false, size: 'md' },
)

const emit = defineEmits<{
  /** Fires once per distinct completion — when the model's length reaches
   * `length` coming from a shorter value, not on every re-render. */
  complete: [code: string]
}>()

defineSlots<{
  /** Custom content for one cell. */
  cell(props: { char: string | null; index: number; active: boolean; filled: boolean }): unknown
}>()

function sanitize(text: string): string {
  const stripped =
    props.type === 'numeric' ? text.replace(/[^0-9]/g, '') : text.replace(/[^a-zA-Z0-9]/g, '')
  return stripped.slice(0, props.length)
}

const fieldControl = useFieldControl({ filled: () => modelValue.value.length > 0 })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

const slots = useSlots()
const hasCustomCell = computed(() => !!slots.cell)

const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const cellEls = useTemplateRef<HTMLElement[]>('cellEls')
const activeIndex = shallowRef(-1)
const isFocused = shallowRef(false)
const focusVisible = shallowRef(false)

function updateActive() {
  const el = inputEl.value
  if (!el || !isFocused.value) {
    activeIndex.value = -1
    return
  }
  const pos = el.selectionStart ?? displayValue.value.length
  activeIndex.value = Math.min(pos, props.length - 1)
}

// preventDefault on pointerdown suppresses the browser's own default
// focus+caret placement (and the mousedown/click that would follow) —
// without this, the native caret lands wherever the invisible input's own
// unstyled text metrics put it (usually the end) for one paint, then jumps
// to the cell actually clicked once this handler corrects it afterward.
// Focusing and setting the selection here ourselves is the only write, so
// there's nothing to visibly flash to first.
function onOverlayPointerDown(event: PointerEvent) {
  if (event.button === 2) return
  const els = cellEls.value
  const el = inputEl.value
  if (!el) return
  event.preventDefault()
  let index = els && els.length > 0 ? els.length - 1 : 0
  if (els) {
    // Click anywhere in cell i's box targets index i (not split at midpoint).
    for (let i = 0; i < els.length; i++) {
      if (event.clientX <= els[i]!.getBoundingClientRect().right) {
        index = i
        break
      }
    }
  }
  // Clamp caret to filled prefix (can't sit past first empty slot).
  index = Math.min(index, displayValue.value.length)
  el.focus()
  el.setSelectionRange(index, index)
  updateActive()
}

function onDocumentSelectionChange() {
  if (document.activeElement !== inputEl.value) return
  updateActive()
}
onMounted(() => document.addEventListener('selectionchange', onDocumentSelectionChange))
// This scope disposes on every render, including SSR, where the listener
// above was never attached (onMounted never runs) and `document` doesn't exist.
onScopeDispose(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('selectionchange', onDocumentSelectionChange)
  }
})

function onNativeInput(event: Event) {
  const target = event.target as HTMLInputElement
  modelValue.value = sanitize(target.value)
  updateActive()
}
function onNativeFocus() {
  isFocused.value = true
  focusVisible.value = focusIsFromKeyboard()
  fieldControl.onFocus()
  updateActive()
}
function onNativeBlur() {
  isFocused.value = false
  focusVisible.value = false
  activeIndex.value = -1
  fieldControl.onBlur()
}

// Clamped view used for display/completeness; sanitize() only runs from native input, so derive from this to stay consistent.
const displayValue = computed(() => modelValue.value.slice(0, props.length))

const cells = computed(() => {
  const value = displayValue.value
  return Array.from({ length: props.length }, (_, index) => {
    const char = value[index] ?? null
    return {
      char,
      filled: char !== null,
      active: activeIndex.value === index,
    }
  })
})

const dataState = computed(() => {
  if (isInvalid.value) return 'invalid'
  return displayValue.value.length === props.length ? 'complete' : 'idle'
})

watch(displayValue, (value) => {
  if (value.length === props.length) emit('complete', value)
})

// Skip pop-in animation on first paint (pre-filled model shouldn't pop all cells on load).
const skipTransition = shallowRef(true)
onMounted(() => {
  void nextTick(() => {
    skipTransition.value = false
  })
})

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.otpInput,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-otp',
    `ui-otp--${props.size}`,
    isDisabled.value && 'ui-otp--disabled',
    skipTransition.value && 'ui-otp--no-anim',
  ),
)
const inputPart = computed(() => resolveUiPart(cx, themedUi()?.input, 'ui-otp-input'))
const cellPart = computed(() =>
  resolveUiPart(cx, themedUi()?.cell, 'ui-otp-cell', hasCustomCell.value && 'ui-otp-cell--custom'),
)

defineExpose({ el: root, inputEl, cellEls })
</script>
