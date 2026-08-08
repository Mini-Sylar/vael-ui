<template>
  <div
    ref="root"
    :role="multiple ? 'group' : 'radiogroup'"
    :id="fieldControl.id"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-invalid="isInvalid || undefined"
    :aria-labelledby="fieldControl.labelledBy()"
    :aria-describedby="fieldControl.describedBy()"
    :aria-invalid="isInvalid || undefined"
    :aria-required="fieldControl.required() || undefined"
  >
    <label
      v-for="item in items"
      :key="item.value"
      :class="optionPart.class"
      :style="optionPart.style"
      :data-checked="isChecked(item) || undefined"
      :data-disabled="isDisabled(item) || undefined"
    >
      <input
        :type="multiple ? 'checkbox' : 'radio'"
        class="ui-select-button-input"
        :name="groupName"
        :value="item.value"
        :checked="isChecked(item)"
        :disabled="isDisabled(item)"
        @click="onOptionClick(item, $event)"
        @change="onInputChange(item, $event)"
      />
      <span class="ui-select-button-content">
        <slot name="item" :item="item" :checked="isChecked(item)">{{ item.label }}</slot>
      </span>
    </label>
    <span
      v-if="!multiple"
      ref="indicatorEl"
      :class="indicatorPart.class"
      :style="[indicatorStyle, indicatorPart.style]"
    />
  </div>
</template>

<script lang="ts">
export interface SelectButtonItem {
  label: string
  value: string | number
  disabled?: boolean
}
</script>

<!-- Native radios (single) or checkboxes (multiple) with sliding indicator; allowEmpty clears on click -->
<script setup lang="ts" generic="T extends SelectButtonItem = SelectButtonItem">
import './SelectButton.css'
import { computed, useId, useTemplateRef } from 'vue'
import { useTabIndicator } from '../../composables/useTabIndicator'
import { useFieldControl } from '../../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const modelValue = defineModel<string | number | (string | number)[] | null>({ default: null })

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<T>
    multiple?: boolean
    /** Single mode only: clicking the active option clears the model. */
    allowEmpty?: boolean
    disabled?: boolean
    size?: 'sm' | 'md' | 'lg'
    name?: string
    ui?: Partial<{ root: UiPartValue; option: UiPartValue; indicator: UiPartValue }>
  }>(),
  { multiple: false, allowEmpty: true, disabled: false, size: 'md' },
)

const emit = defineEmits<{
  change: [value: string | number | (string | number)[] | null]
}>()

defineSlots<{
  item(props: { item: T; checked: boolean }): unknown
}>()

const generatedName = useId()
const groupName = computed(() => props.name ?? generatedName)

const fieldControl = useFieldControl({
  filled: () =>
    props.multiple
      ? Array.isArray(modelValue.value) && modelValue.value.length > 0
      : modelValue.value !== null,
})
const isInvalid = computed(() => fieldControl.invalid())

function isChecked(item: T): boolean {
  if (props.multiple) {
    return Array.isArray(modelValue.value) && modelValue.value.includes(item.value)
  }
  return modelValue.value === item.value
}
function isDisabled(item: T): boolean {
  return props.disabled || fieldControl.disabled() || !!item.disabled
}

function onOptionClick(item: T, event: MouseEvent) {
  if (props.multiple || isDisabled(item)) return
  if (props.allowEmpty && modelValue.value === item.value) {
    event.preventDefault()
    modelValue.value = null
    emit('change', null)
  }
}
function onInputChange(item: T, event: Event) {
  if (props.multiple) {
    const checked = (event.target as HTMLInputElement).checked
    const current = Array.isArray(modelValue.value) ? modelValue.value : []
    const next = checked ? [...current, item.value] : current.filter((v) => v !== item.value)
    modelValue.value = next
    emit('change', next)
    return
  }
  modelValue.value = item.value
  emit('change', item.value)
}

const root = useTemplateRef<HTMLElement>('root')
const { style: indicatorStyle } = useTabIndicator(modelValue, {
  listEl: root,
  selector: '[data-checked]',
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.selectButton,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-select-button',
    `ui-select-button--${props.size}`,
    (props.disabled || fieldControl.disabled()) && 'ui-select-button--disabled',
  ),
)
const optionPart = computed(() => resolveUiPart(cx, themedUi()?.option, 'ui-select-button-option'))
const indicatorPart = computed(() =>
  resolveUiPart(cx, themedUi()?.indicator, 'ui-select-button-indicator'),
)

const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
defineExpose({ el: root, indicatorEl })
</script>
