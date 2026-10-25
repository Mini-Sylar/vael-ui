<template>
  <div
    ref="root"
    :class="rootClass"
    :style="[rootStyle, attrs.style as never]"
    :data-state="dataState"
    :data-ui-frame="props.size"
    :data-focus-visible="focusVisible || undefined"
    @mousedown="onFrameMousedown"
  >
    <span v-if="$slots.start" ref="startEl" :class="startPart.class" :style="startPart.style"
      ><slot name="start"
    /></span>
    <!-- readonly || undefined: Vapor compiler requires undefined, not false, to omit the attribute -->
    <input
      ref="inputEl"
      :id="fieldControl.id"
      v-bind="restAttrs"
      :type="type"
      :class="inputPart.class"
      :style="inputPart.style"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :readonly="readonly || undefined"
      :aria-describedby="describedBy"
      :aria-invalid="isInvalid || undefined"
      :aria-required="fieldControl.required() || undefined"
      :data-ui-display="displayMode"
      @input="onNativeInput"
      @change="onNativeChange"
      @focus="onNativeFocus"
      @blur="onNativeBlur"
    />
    <span
      v-if="displayMode"
      class="ui-input-display"
      :style="overlay.style.value"
      aria-hidden="true"
    >
      <span class="ui-input-display-track" :style="{ translate: `${-overlay.scroll.value.x}px 0` }">
        <slot
          name="display"
          :value="modelValue"
          :placeholder="placeholder ?? ''"
          :focused="focused"
        >
          <LazyAnimatedText
            v-if="modelValue === ''"
            class="ui-input-display-placeholder"
            :value="placeholder ?? ''"
          />
          <LazyAnimatedText v-else :value="modelValue" />
        </slot>
      </span>
    </span>
    <Transition
      name="ui-clear"
      @enter="measureClearSpace"
      @leave="startClearLeave"
      @leave-cancelled="resetLeaveStyles"
    >
      <button
        v-if="clearable && modelValue !== '' && !isDisabled && !readonly"
        type="button"
        :class="clearPart.class"
        :style="clearPart.style"
        :aria-label="messages.input.clear"
        @click="onClear"
        @mousedown.prevent
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </Transition>
    <span v-if="$slots.end" ref="endEl" :class="endPart.class" :style="endPart.style"
      ><slot name="end"
    /></span>
  </div>
</template>

<!-- inheritAttrs: false; class/style → root, input attrs → input; frame mousedown focuses input (guarded) -->
<script setup lang="ts">
import './Input.css'
import '../shared/clear-transition.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import {
  computed,
  onBeforeUnmount,
  shallowRef,
  useAttrs,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import LazyAnimatedText from '../internal/LazyAnimatedText.vue'
import { useTextOverlay } from '../../composables/useTextOverlay'
import { useFieldControl } from '../../composables/useFieldControl'
import {
  measureClearSpace,
  resetLeaveStyles,
  startClearLeave,
  useSlotPresence,
} from '../../composables/dom'
import { useMessages, inputMessages } from '../../messages'
import { omitAttrs, useForwardedListener } from '../../composables/forwardedListeners'
import { focusIsFromKeyboard } from '../../composables/useFocusVisible'
import { useFormReset } from '../../composables/useFormReset'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useStateMotion } from '../../motion/useStateMotion'
import type { InputMotion } from '../../motion/types'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

/** Input value. Supports the `.trim` and `.lazy` modifiers. @default '' */
const [modelValue, modifiers] = defineModel<string>({ default: '' })

const rawProps = withDefaults(
  defineProps<{
    /** Native input `type`. @default 'text' */
    type?: string
    /** Control size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Disables the input and blocks interaction. A disabled parent Field also disables it. @default false */
    disabled?: boolean
    /** Makes the value read-only while keeping it focusable and selectable. @default false */
    readonly?: boolean
    /** Standalone override; ORed with the nearest Field's `error` state. @default false */
    invalid?: boolean
    /** Text shown while the input is empty. */
    placeholder?: string
    /** Shows a button that empties the input while it has text. @default false */
    clearable?: boolean
    /**
     * Crossfades a placeholder or value that changes on its own, like AnimatedText. What you type
     * never animates. @default false
     */
    animated?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      start: UiPartValue
      end: UiPartValue
      /** The clear button. */
      clear: UiPartValue
    }>
    /** Animates its states, like a shake when it turns invalid: `{ states: { invalid: { root: { x: [0, -6, 6, -3, 0] } } } }`. */
    motion?: InputMotion
  }>(),
  {
    type: 'text',
    disabled: false,
    readonly: false,
    invalid: false,
    clearable: false,
    animated: false,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)
const props = withProviderDefaults(rawProps, { size: 'md' })

defineSlots<{
  /** Inline leading content, such as an icon, a Kbd hint or a copy Button. */
  start(): unknown
  /** Inline trailing content. */
  end(): unknown
  /**
   * Draws the text yourself, over the input's own text box and following its scroll, for a fancy
   * input: characters that animate in, gradients, highlighted tokens. The input underneath keeps
   * the caret, selection and screen reader text; its own text is hidden. Give an element
   * `pointer-events: auto` to let it take hover, say for a popover on a mention.
   */
  display(props: { value: string; placeholder: string; focused: boolean }): unknown
}>()

const emit = defineEmits<{
  /** Fires when the clear button empties the input. */
  clear: []
}>()

function commit(value: string) {
  modelValue.value = modifiers.trim ? value.trim() : value
}
function onNativeInput(event: Event) {
  try {
    if (modifiers.lazy) return
    commit((event.target as HTMLInputElement).value)
  } finally {
    forward('onInput', event)
  }
}
function onNativeChange(event: Event) {
  try {
    if (!modifiers.lazy) return
    commit((event.target as HTMLInputElement).value)
  } finally {
    forward('onChange', event)
  }
}

const fieldStartInset = shallowRef(0)
const fieldControl = useFieldControl({
  filled: () => modelValue.value.length > 0,
  startInset: fieldStartInset,
  frame: { el: () => root.value, size: () => props.size },
})
const focusVisible = shallowRef(false)
const focused = shallowRef(false)
function onNativeFocus(event: FocusEvent) {
  try {
    focused.value = true
    focusVisible.value = focusIsFromKeyboard()
    fieldControl.onFocus()
  } finally {
    forward('onFocus', event)
  }
}
function onNativeBlur(event: FocusEvent) {
  try {
    focused.value = false
    focusVisible.value = false
    fieldControl.onBlur()
  } finally {
    forward('onBlur', event)
  }
}

// Focus stays in the input, or comes back to it from the clear button.
function onClear() {
  modelValue.value = ''
  emit('clear')
  inputEl.value?.focus()
}

function onFrameMousedown(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button, a, input, select, textarea, [tabindex]')) return
  event.preventDefault()
  inputEl.value?.focus()
}

const messages = useMessages({ input: inputMessages })
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const dataState = computed(() => (isInvalid.value ? 'invalid' : 'idle'))

const attrs = useAttrs()
const forward = useForwardedListener(attrs)
const restAttrs = computed(() =>
  omitAttrs(attrs, [
    'class',
    'style',
    'aria-describedby',
    'onInput',
    'onChange',
    'onFocus',
    'onBlur',
  ]),
)
// Yours first, then the Field's description and error.
const describedBy = computed(
  () =>
    [attrs['aria-describedby'], fieldControl.describedBy()].filter(Boolean).join(' ') || undefined,
)

const root = useTemplateRef<HTMLElement>('root')
useFormReset(modelValue, () => root.value)
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const startEl = useTemplateRef<HTMLElement>('startEl')
const endEl = useTemplateRef<HTMLElement>('endEl')

useStateMotion({
  key: 'input',
  mainPart: 'root',
  motion: () => props.motion,
  parts: () => ({ root: root.value, input: inputEl.value, start: startEl.value, end: endEl.value }),
  states: () => ({ invalid: isInvalid.value, disabled: isDisabled.value, focus: focused.value }),
})

// `all` hides the input's text for #display; `animated` crossfades the placeholder, and the value
// while you're not in the field, so typing stays plain.
const slots = useSlots()
const hasSlot = useSlotPresence(slots)
const displayMode = computed(() => {
  if (hasSlot('display')) return 'all'
  if (!props.animated) return undefined
  if (modelValue.value === '') return 'placeholder'
  // A password is never drawn as text.
  return focused.value || props.type === 'password' ? undefined : 'value'
})
const overlay = useTextOverlay(inputEl, root, () => displayMode.value !== undefined)

// Measures the real <input>'s offset from the frame edge, rather than assuming a fixed gap.
function measureStartInset() {
  const frame = root.value
  const input = inputEl.value
  fieldStartInset.value =
    frame && input
      ? Math.round(input.getBoundingClientRect().left - frame.getBoundingClientRect().left)
      : 0
}
let startResizeObserver: ResizeObserver | undefined
watch(
  startEl,
  (el) => {
    startResizeObserver?.disconnect()
    if (!el) {
      fieldStartInset.value = 0
      return
    }
    measureStartInset()
    startResizeObserver = new ResizeObserver(measureStartInset)
    startResizeObserver.observe(el)
  },
  { immediate: true },
)
onBeforeUnmount(() => startResizeObserver?.disconnect())

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.input,
  () => props.ui,
)
// Consumer attrs are higher-precedence escape hatch than ui.root
const rootSplit = computed(() => splitUiPart(themedUi()?.root))
const rootClass = computed(() =>
  cx(
    'ui-input',
    `ui-input--${props.size}`,
    isDisabled.value && 'ui-input--disabled',
    rootSplit.value.class,
    attrs.class as string | undefined,
  ),
)
const rootStyle = computed(() => rootSplit.value.style)
const inputPart = computed(() => resolveUiPart(cx, themedUi()?.input, 'ui-input-el'))
const startPart = computed(() => resolveUiPart(cx, themedUi()?.start, 'ui-input-start'))
const endPart = computed(() => resolveUiPart(cx, themedUi()?.end, 'ui-input-end'))
const clearPart = computed(() => resolveUiPart(cx, themedUi()?.clear, 'ui-input-clear'))

defineExpose({
  /** Root element (the frame around the input). */
  el: root,
  /** Native `<input>` element. */
  inputEl,
})
</script>
