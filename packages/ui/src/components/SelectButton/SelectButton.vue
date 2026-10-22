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
    v-bind="attrs"
  >
    <span
      ref="hoverEl"
      class="ui-indicator ui-indicator--inline ui-select-button-hover"
      :style="hoverStyle"
      aria-hidden="true"
    />
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
        @click="onOptionClick(item)"
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
import '../shared/indicator.css'
import { useHoverIndicator } from '../../composables/useHoverIndicator'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, useAttrs, useId, useTemplateRef } from 'vue'
import { useTabIndicator } from '../../composables/useTabIndicator'
import { useFieldControl } from '../../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import { useIndicatorMotion } from '../../composables/useIndicatorMotion'
import type { SelectButtonMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

/** Selected value, an array of values with `multiple`, or `null` when nothing is selected. @default null */
const modelValue = defineModel<string | number | (string | number)[] | null>({ default: null })

const rawProps = withDefaults(
  defineProps<{
    /** Options to choose from. */
    items: ReadonlyArray<T>
    /** Turns on multi-select; the model becomes an array. @default false */
    multiple?: boolean
    /** Single mode only: clicking the active option clears the model. @default true */
    allowEmpty?: boolean
    /** Disables every option and blocks interaction. @default false */
    disabled?: boolean
    /** Control size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Native `name` for form submission. Auto-generated when omitted. */
    name?: string
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; option: UiPartValue; indicator: UiPartValue }>
    /** How it moves: its appearance, option by option (`{ initial: { option: { opacity: 0, y: 4 } }, stagger: 0.03 }`), over `root`, `option` and the selection `indicator`, and its states (`{ states: { disabled: { root: { opacity: 0.6 } } } }`). `spring` retimes the indicator; `move` hands its moves to your own animation. `false` turns its own animation off. */
    motion?: SelectButtonMotion
  }>(),
  // `motion`: absent must read as unset, not `false` (Vue's boolean casting would turn it off).
  { multiple: false, allowEmpty: true, disabled: false, motion: undefined },
)
const props = withProviderDefaults(rawProps, { size: 'md' })

const emit = defineEmits<{
  /** Fires when you change the selection, with the new model value. */
  change: [value: string | number | (string | number)[] | null]
}>()

defineSlots<{
  /** Custom content for each option. Receives `item` and `checked`. */
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

function onOptionClick(item: T) {
  if (props.multiple || isDisabled(item)) return
  if (props.allowEmpty && modelValue.value === item.value) {
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
const parts = useStateMotion({
  key: 'selectButton',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: {
    root: '.ui-select-button',
    option: '.ui-select-button-option',
    indicator: '.ui-select-button-indicator',
  },
  states: () => ({ disabled: props.disabled || fieldControl.disabled() }),
})
// The hover and keyboard highlight slides between options, under the selected one's indicator.
const hoverEl = useTemplateRef<HTMLElement>('hoverEl')
const { style: hoverStyle } = useHoverIndicator(root, {
  itemSelector: '.ui-select-button-option',
  orientation: 'horizontal',
  indicatorEl: hoverEl,
})
const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
const indicatorMotion = useIndicatorMotion({
  name: 'SelectButton',
  motion: () => props.motion,
  indicator: () => indicatorEl.value,
  parts: () => parts(),
})
const { style: indicatorStyle } = useTabIndicator(modelValue, {
  listEl: root,
  selector: '[data-checked]',
  indicatorEl,
  indicator: indicatorMotion.spring,
  motion: () => (indicatorMotion.handsOff() || props.motion === false ? false : undefined),
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

defineExpose({
  /** Root element. */
  el: root,
  /** Sliding selection indicator (single mode only; `null` with `multiple`). */
  indicatorEl,
  /** The hover and keyboard highlight, sliding between options. Under a ConfigProvider with `motion: false` it moves at once, for your own animation. */
  highlightEl: hoverEl,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
