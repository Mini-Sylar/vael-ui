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
import { computed, provide, useId, useTemplateRef } from 'vue'
import { useFieldControl } from '../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const modelValue = defineModel<string | number | null>({ default: null })

const props = withDefaults(
  defineProps<{
    name?: string
    /** Disables all Radio children. */
    disabled?: boolean
    orientation?: 'horizontal' | 'vertical'
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { disabled: false, orientation: 'vertical' },
)

const emit = defineEmits<{ change: [value: string | number | null] }>()

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

defineExpose({ el: root })
</script>
