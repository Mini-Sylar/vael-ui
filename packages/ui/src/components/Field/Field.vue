<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="dataAttrs">
    <div :class="controlPart.class" :style="[controlPart.style, controlVars]">
      <label
        v-if="label || $slots.label"
        :for="controlId"
        :id="labelId"
        :class="labelPart.class"
        :style="labelPart.style"
      >
        <slot name="label">{{ label }}</slot>
        <span v-if="required" class="ui-field-required" aria-hidden="true">*</span>
      </label>
      <slot />
    </div>
    <p
      v-if="description || $slots.description"
      :id="descriptionId"
      :class="descriptionPart.class"
      :style="descriptionPart.style"
    >
      <slot name="description">{{ description }}</slot>
    </p>
    <Transition name="ui-field-error">
      <p v-if="error" :id="errorId" role="alert" :class="errorPart.class" :style="errorPart.style">
        <slot name="error" :error="error">{{ error }}</slot>
      </p>
    </Transition>
  </div>
</template>

<!-- Owns presentation + ARIA wiring; label inside control for overlap on float/inset placements -->
<script setup lang="ts">
import './Field.css'
import '../shared/tokens.css'
import { computed, provide, shallowRef, useId, useSlots, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { fieldKey } from '../../composables/fieldContext'
import type { FieldContext } from '../../composables/fieldContext'

const props = withDefaults(
  defineProps<{
    /** Label text, linked to the wrapped control. */
    label?: string
    /** Help text below the control, linked via `aria-describedby`. */
    description?: string
    /** Error message; renders with `role="alert"`. */
    error?: string
    /** Shows a required marker and sets `aria-required` on the wrapped control. */
    required?: boolean
    /** Disables the wrapped control. */
    disabled?: boolean
    /**
     * `'top'` stacks above the control; `'float'` overlays its edge, moving up on focus or fill; `'inset'` sits inside it.
     * @default 'top'
     */
    labelPlacement?: 'top' | 'float' | 'inset'
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      label: UiPartValue
      control: UiPartValue
      description: UiPartValue
      error: UiPartValue
    }>
  }>(),
  { labelPlacement: 'top' },
)

defineSlots<{
  /** The form control that the field labels and describes. */
  default(): unknown
  /** Replaces the label text, keeping the `<label>` element and its `for` wiring. */
  label(): unknown
  /** Custom description content; replaces the `description` text. */
  description(): unknown
  /** Custom error content; renders only while `error` is set. */
  error(props: { error: string }): unknown
}>()

const controlId = useId()
const labelId = useId()
const descriptionId = useId()
const errorId = useId()

const slots = useSlots()
const focused = shallowRef(false)
const filled = shallowRef(false)
const startInset = shallowRef(0)

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.description || slots.description) ids.push(descriptionId)
  if (props.error) ids.push(errorId)
  return ids.length ? ids.join(' ') : undefined
})
const isInvalid = computed(() => !!props.error)

provide<FieldContext>(fieldKey, {
  controlId,
  labelId,
  describedBy: () => describedBy.value,
  invalid: () => isInvalid.value,
  required: () => !!props.required,
  disabled: () => !!props.disabled,
  reportFocus: (value) => {
    focused.value = value
  },
  reportFilled: (value) => {
    filled.value = value
  },
  reportStartInset: (value) => {
    startInset.value = value
  },
})

const controlVars = computed(() => ({ '--ui-field-start-inset': `${startInset.value}px` }))

const dataAttrs = computed(() => ({
  'data-placement': props.labelPlacement,
  'data-focused': focused.value || undefined,
  'data-filled': filled.value || undefined,
  'data-invalid': isInvalid.value || undefined,
  'data-disabled': props.disabled || undefined,
}))

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.field,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-field'))
const controlPart = computed(() => resolveUiPart(cx, themedUi()?.control, 'ui-field-control'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-field-label'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-field-description'),
)
const errorPart = computed(() => resolveUiPart(cx, themedUi()?.error, 'ui-field-error'))

defineExpose({
  /** Root element. */
  el: root,
})
</script>
