<template>
  <div
    ref="root"
    :class="rootClass"
    :style="[rootStyle, attrs.style as never]"
    :data-state="dataState"
    :data-focus-visible="focusVisible || undefined"
    @mousedown="onFrameMousedown"
  >
    <span v-if="$slots.start" :class="startPart.class" :style="startPart.style"
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
      :aria-describedby="fieldControl.describedBy()"
      :aria-invalid="isInvalid || undefined"
      :aria-required="fieldControl.required() || undefined"
      @input="onNativeInput"
      @change="onNativeChange"
      @focus="onNativeFocus"
      @blur="onNativeBlur"
    />
    <span v-if="$slots.end" :class="endPart.class" :style="endPart.style"><slot name="end" /></span>
  </div>
</template>

<!-- inheritAttrs: false; class/style → root, input attrs → input; frame mousedown focuses input (guarded) -->
<script setup lang="ts">
import './Input.css'
import { computed, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { focusIsFromKeyboard } from '../../composables/useFocusVisible'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const [modelValue, modifiers] = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    type?: string
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    readonly?: boolean
    /** Standalone override; ORed with the nearest Field's `error` state. */
    invalid?: boolean
    placeholder?: string
    ui?: Partial<{ root: UiPartValue; input: UiPartValue; start: UiPartValue; end: UiPartValue }>
  }>(),
  { type: 'text', size: 'md', disabled: false, readonly: false, invalid: false },
)

defineSlots<{
  /** Inline leading content (icon, kbd hint, a copy Button). */
  start(): unknown
  /** Inline trailing content. */
  end(): unknown
}>()

function commit(value: string) {
  modelValue.value = modifiers.trim ? value.trim() : value
}
function onNativeInput(event: Event) {
  if (modifiers.lazy) return
  commit((event.target as HTMLInputElement).value)
}
function onNativeChange(event: Event) {
  if (!modifiers.lazy) return
  commit((event.target as HTMLInputElement).value)
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
  inputEl.value?.focus()
}

const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const dataState = computed(() => (isInvalid.value ? 'invalid' : 'idle'))

const attrs = useAttrs()
const restAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const root = useTemplateRef<HTMLElement>('root')
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
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

defineExpose({ el: root, inputEl })
</script>
