<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="dataAttrs">
    <div :class="controlPart.class" :style="controlPart.style">
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
import { computed, provide, shallowRef, useId, useSlots, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'
import { fieldKey } from '../composables/fieldContext'
import type { FieldContext } from '../composables/fieldContext'

const props = withDefaults(
  defineProps<{
    label?: string
    description?: string
    /** Error message; renders with `role="alert"`. */
    error?: string
    required?: boolean
    disabled?: boolean
    labelPlacement?: 'top' | 'float' | 'inset'
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
  default(): unknown
  /** Replaces label text without affecting label element or for wiring. */
  label(): unknown
  description(): unknown
  error(props: { error: string }): unknown
}>()

const controlId = useId()
const labelId = useId()
const descriptionId = useId()
const errorId = useId()

const slots = useSlots()
const focused = shallowRef(false)
const filled = shallowRef(false)

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
})

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

defineExpose({ el: root })
</script>
