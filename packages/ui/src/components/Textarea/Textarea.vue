<template>
  <div
    ref="root"
    :class="rootClass"
    :style="[rootStyle, attrs.style as never]"
    :data-state="dataState"
    :data-focus-visible="focusVisible || undefined"
    :data-multiline="isMultiline || undefined"
    @mousedown="onFrameMousedown"
  >
    <span v-if="$slots.start" :class="startPart.class" :style="startPart.style"
      ><slot name="start"
    /></span>
    <!-- Vapor bug: :readonly="readonly || undefined" prevents `false` from rendering as attribute -->
    <textarea
      ref="textareaEl"
      :id="fieldControl.id"
      v-bind="restAttrs"
      :class="textareaPart.class"
      :style="[textareaStyle, textareaPart.style]"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :readonly="readonly || undefined"
      :rows="rows"
      :aria-describedby="fieldControl.describedBy()"
      :aria-invalid="isInvalid || undefined"
      :aria-required="fieldControl.required() || undefined"
      @input="onNativeInput"
      @change="onNativeChange"
      @focus="onNativeFocus"
      @blur="onNativeBlur"
    />
    <span v-if="$slots.end" :class="endPart.class" :style="endPart.style"><slot name="end" /></span>
    <div v-if="$slots['bottom-start'] || $slots['bottom-end']" :class="bottomClass">
      <span
        v-if="$slots['bottom-start']"
        :class="bottomStartPart.class"
        :style="bottomStartPart.style"
        ><slot name="bottom-start"
      /></span>
      <span v-if="$slots['bottom-end']" :class="bottomEndPart.class" :style="bottomEndPart.style"
        ><slot name="bottom-end"
      /></span>
    </div>
  </div>
</template>

<!--
  Frame-click delegates to textarea (see Input.vue). Auto-grow: CSS-native field-sizing
  with JavaScript fallback (Firefox); no style conflicts with fallback blockSize.
-->
<script setup lang="ts">
import './Textarea.css'
import '../shared/tokens.css'
import { computed, onMounted, onScopeDispose, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { focusIsFromKeyboard } from '../../composables/useFocusVisible'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const [modelValue, modifiers] = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    readonly?: boolean
    /** Standalone override; ORed with the nearest Field's `error` state. */
    invalid?: boolean
    placeholder?: string
    /** Native `rows` attribute — also the auto-grow minimum. */
    rows?: number
    /** Enable auto-grow behavior. */
    autoGrow?: boolean
    /** Only meaningful with `autoGrow`; omitted means no cap. */
    maxRows?: number
    ui?: Partial<{
      root: UiPartValue
      textarea: UiPartValue
      start: UiPartValue
      end: UiPartValue
      bottomStart: UiPartValue
      bottomEnd: UiPartValue
    }>
  }>(),
  { size: 'md', disabled: false, readonly: false, invalid: false, rows: 3, autoGrow: false },
)

defineSlots<{
  /** Inline leading content (centered on the resting height). */
  start(): unknown
  end(): unknown
  /** Bottom-left of the action strip (attachment button, …). */
  'bottom-start'(): unknown
  /** Bottom-right of the action strip (char counter, send button, …). */
  'bottom-end'(): unknown
}>()

function commit(value: string) {
  modelValue.value = modifiers.trim ? value.trim() : value
}
function onNativeInput(event: Event) {
  if (modifiers.lazy) return
  commit((event.target as HTMLTextAreaElement).value)
}
function onNativeChange(event: Event) {
  if (!modifiers.lazy) return
  commit((event.target as HTMLTextAreaElement).value)
}

const fieldControl = useFieldControl({ filled: () => modelValue.value.length > 0 })
const focusVisible = shallowRef(false)
function onNativeFocus() {
  focusVisible.value = focusIsFromKeyboard()
  fieldControl.onFocus()
}
function onNativeBlur() {
  focusVisible.value = false
  fieldControl.onBlur()
}

function onFrameMousedown(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button, a, input, select, textarea, [tabindex]')) return
  event.preventDefault()
  textareaEl.value?.focus()
}

const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const dataState = computed(() => (isInvalid.value ? 'invalid' : 'idle'))

const textareaEl = useTemplateRef<HTMLTextAreaElement>('textareaEl')

function adjustHeightFallback() {
  const el = textareaEl.value
  if (!el) return
  el.style.blockSize = 'auto'
  el.style.blockSize = `${el.scrollHeight}px`
}

// Pin slots to top when multiline (not re-centering as box grows) — compare against fixed one-line height, not resolved min-block-size (consumer-overridable).
const isMultiline = shallowRef(false)
let resizeObserver: ResizeObserver | undefined
function checkMultiline() {
  const el = textareaEl.value
  if (!el) return
  const cs = getComputedStyle(el)
  const oneLineHeight =
    parseFloat(cs.lineHeight) + parseFloat(cs.paddingBlockStart) + parseFloat(cs.paddingBlockEnd)
  isMultiline.value = el.clientHeight > oneLineHeight + 1
}

onMounted(() => {
  const supportsFieldSizing = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')
  if (props.autoGrow && !supportsFieldSizing) {
    adjustHeightFallback()
    textareaEl.value?.addEventListener('input', adjustHeightFallback)
  }
  if (props.autoGrow && textareaEl.value) {
    checkMultiline()
    resizeObserver = new ResizeObserver(checkMultiline)
    resizeObserver.observe(textareaEl.value)
  }
})
onScopeDispose(() => {
  textareaEl.value?.removeEventListener('input', adjustHeightFallback)
  resizeObserver?.disconnect()
})

const attrs = useAttrs()
const restAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const textareaStyle = computed(() => ({
  '--ui-textarea-rows': String(props.rows),
  ...(props.maxRows != null ? { '--ui-textarea-max-rows': String(props.maxRows) } : {}),
}))

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.textarea,
  () => props.ui,
)
// Same "override in the middle, attrs win last" ordering as Input.vue's
// root — see its comment.
const rootSplit = computed(() => splitUiPart(themedUi()?.root))
const rootClass = computed(() =>
  cx(
    'ui-textarea',
    `ui-textarea--${props.size}`,
    isDisabled.value && 'ui-textarea--disabled',
    props.autoGrow && 'ui-textarea--auto-grow',
    rootSplit.value.class,
    attrs.class as string | undefined,
  ),
)
const rootStyle = computed(() => rootSplit.value.style)
const textareaPart = computed(() => resolveUiPart(cx, themedUi()?.textarea, 'ui-textarea-el'))
const startPart = computed(() => resolveUiPart(cx, themedUi()?.start, 'ui-textarea-start'))
const endPart = computed(() => resolveUiPart(cx, themedUi()?.end, 'ui-textarea-end'))
const bottomClass = computed(() => cx('ui-textarea-bottom'))
const bottomStartPart = computed(() =>
  resolveUiPart(cx, themedUi()?.bottomStart, 'ui-textarea-bottom-start'),
)
const bottomEndPart = computed(() =>
  resolveUiPart(cx, themedUi()?.bottomEnd, 'ui-textarea-bottom-end'),
)

defineExpose({ el: root, textareaEl })
</script>
