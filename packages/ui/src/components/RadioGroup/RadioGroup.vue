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
  invalid?: () => boolean
}

/** Injection key for RadioGroup context. */
export const radioGroupKey: InjectionKey<RadioGroupContext> = Symbol('ui-radio-group')
</script>

<!-- Compound component: owns model and shared name; native radios give APG roving arrows for free; orientation is layout-only -->
<script setup lang="ts">
import './RadioGroup.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, provide, useAttrs, useId, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { useFormReset } from '../../composables/useFormReset'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { RadioGroupMotion } from '../../motion/types'

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
    /** How it moves: its appearance (`{ initial: { root: { opacity: 0, y: 4 } } }`); each Radio keeps its own `motion`. `false` turns its own animation off. */
    motion?: RadioGroupMotion
  }>(),
  {
    disabled: false,
    orientation: 'vertical',
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
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
  invalid: () => isInvalid.value,
})

const root = useTemplateRef<HTMLElement>('root')
useFormReset(modelValue, () => root.value)
const parts = useStateMotion({
  key: 'radioGroup',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-radio-group' },
  states: () => ({}),
})
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
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
