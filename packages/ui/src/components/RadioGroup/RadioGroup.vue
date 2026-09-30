<template>
  <div
    ref="root"
    role="radiogroup"
    :id="fieldControl.id"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-invalid="isInvalid || undefined"
    :aria-labelledby="fieldControl.labelledBy()"
    :aria-describedby="fieldControl.describedBy()"
    :aria-invalid="isInvalid || undefined"
    :aria-required="fieldControl.required() || undefined"
    v-bind="attrs"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'

export interface RadioGroupContext {
  /** Shared native `name` every Radio's input binds to. */
  name: () => string
  isChecked: (value: string | number) => boolean
  select: (value: string | number) => void
  disabled: () => boolean
}

/** Injection key for RadioGroup context. */
export const radioGroupKey: InjectionKey<RadioGroupContext> = Symbol('ui-radio-group')
</script>

<!-- Compound component: owns model and shared name; native radios give APG roving arrows for free; orientation is layout-only -->
<script setup lang="ts">
import './RadioGroup.css'
import '../shared/tokens.css'
import { computed, provide, useAttrs, useId, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

/** Value of the selected Radio, or `null` when none is selected. @default null */
const modelValue = defineModel<string | number | null>({ default: null })

const props = withDefaults(
  defineProps<{
    /** Native `name` shared by every Radio's input. Auto-generated when omitted. */
    name?: string
    /** Disables every Radio in the group. @default false */
    disabled?: boolean
    /** Lays the radios out in a row or a column. @default 'vertical' */
    orientation?: 'horizontal' | 'vertical'
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { disabled: false, orientation: 'vertical' },
)

const emit = defineEmits<{
  /** Fires when you select a different Radio, with its value. */
  change: [value: string | number | null]
}>()

defineSlots<{
  /** The group's `Radio` items. */
  default(): unknown
}>()

const fieldControl = useFieldControl({ filled: () => modelValue.value !== null })
const isInvalid = computed(() => fieldControl.invalid())

const generatedName = useId()

function select(value: string | number) {
  if (modelValue.value === value) return
  modelValue.value = value
  emit('change', value)
}

provide<RadioGroupContext>(radioGroupKey, {
  name: () => props.name ?? generatedName,
  isChecked: (value) => modelValue.value === value,
  select,
  disabled: () => props.disabled || fieldControl.disabled(),
})

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.radioGroup,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-radio-group',
    props.orientation === 'vertical' && 'ui-radio-group--vertical',
  ),
)

defineExpose({
  /** Root element. */
  el: root,
})
</script>
