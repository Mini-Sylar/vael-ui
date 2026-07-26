<template>
  <Input
    ref="inputRef"
    v-model="displayValue"
    type="text"
    inputmode="decimal"
    autocomplete="off"
    role="spinbutton"
    :size="size"
    :disabled="isDisabled"
    :readonly="readonly"
    :invalid="isInvalid"
    :placeholder="placeholder"
    :name="name"
    :ui="innerUi"
    :aria-valuenow="modelValue ?? undefined"
    :aria-valuemin="min"
    :aria-valuemax="max"
    @beforeinput="onBeforeInput"
    @keydown="onKeydown"
    @focus="onFocus"
    @blur="onBlur"
  >
    <template v-if="$slots.start || showSplitControls" #start>
      <slot name="start" />
      <button
        v-if="showSplitControls"
        type="button"
        tabindex="-1"
        :class="decPart.class"
        :style="decPart.style"
        :disabled="isDisabled"
        :data-disabled="atMin || undefined"
        :aria-label="messages.inputNumber.decrement"
        @pointerdown.prevent="onStepperDown(-step)"
        @pointerup="onStepperUp"
        @pointerleave="onStepperUp"
      >
        <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" fill="none">
          <path d="M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </template>
    <template #end>
      <slot name="end" />
      <span v-if="showColumnControls" class="ui-input-number-steppers">
        <button
          type="button"
          tabindex="-1"
          :class="incPart.class"
          :style="incPart.style"
          :disabled="isDisabled"
          :data-disabled="atMax || undefined"
          :aria-label="messages.inputNumber.increment"
          @pointerdown.prevent="onStepperDown(step)"
          @pointerup="onStepperUp"
          @pointerleave="onStepperUp"
        >
          <svg viewBox="0 0 12 10" width="10" height="8" aria-hidden="true" fill="none">
            <path
              d="M2 7l4-4 4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          tabindex="-1"
          :class="decPart.class"
          :style="decPart.style"
          :disabled="isDisabled"
          :data-disabled="atMin || undefined"
          :aria-label="messages.inputNumber.decrement"
          @pointerdown.prevent="onStepperDown(-step)"
          @pointerup="onStepperUp"
          @pointerleave="onStepperUp"
        >
          <svg viewBox="0 0 12 10" width="10" height="8" aria-hidden="true" fill="none">
            <path
              d="M2 3l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </span>
      <button
        v-if="showSplitControls"
        type="button"
        tabindex="-1"
        :class="incPart.class"
        :style="incPart.style"
        :disabled="isDisabled"
        :data-disabled="atMax || undefined"
        :aria-label="messages.inputNumber.increment"
        @pointerdown.prevent="onStepperDown(step)"
        @pointerup="onStepperUp"
        @pointerleave="onStepperUp"
      >
        <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" fill="none">
          <path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </template>
  </Input>
</template>

<!--
  Composes Input (reusing field/aria/label wiring); stepper column in #end slot.
  beforeinput gates keystrokes via useNumberFormat.isPartial/parse (no caret math).
  Model commits live on full parse or null (clearing unambiguous); blur reformats + clamps.
  Steppers: tabindex=-1 (arrows on input), decimal-safe math (0.1 + 0.2 = 0.3).
  Press-and-hold repeats (500ms delay, 60ms thereafter); pointerdown for instant feedback.
  Comments outside template to avoid DOM nodes in production.
-->
<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import Input from './Input.vue'
import { useFieldControl } from '../composables/useFieldControl'
import { useNumberFormat } from '../composables/useNumberFormat'
import { useUiMessages } from '../messages'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const modelValue = defineModel<number | null>({ default: null })

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    locale?: string
    mode?: 'decimal' | 'currency' | 'percent'
    /** ISO 4217 currency code — required when `mode="currency"`. */
    currency?: string
    minFractionDigits?: number
    maxFractionDigits?: number
    useGrouping?: boolean
    /** Literal affix rendered outside Intl, e.g. a unit label. */
    prefix?: string
    suffix?: string
    controls?: boolean
    /** `'end'` (default): stacked +/- column after the value. `'split'`: one full-height button on each side. */
    stepperPosition?: 'end' | 'split'
    /** `false` coerces a blur-empty field to `min ?? 0` instead of `null`. */
    allowEmpty?: boolean
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    readonly?: boolean
    invalid?: boolean
    placeholder?: string
    name?: string
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      increment: UiPartValue
      decrement: UiPartValue
    }>
  }>(),
  {
    step: 1,
    mode: 'decimal',
    useGrouping: true,
    controls: true,
    stepperPosition: 'end',
    allowEmpty: true,
    size: 'md',
    disabled: false,
    readonly: false,
    invalid: false,
  },
)

defineSlots<{
  start(): unknown
  end(): unknown
}>()

const numberFormat = useNumberFormat({
  locale: () => props.locale,
  mode: () => props.mode,
  currency: () => props.currency,
  minFractionDigits: () => props.minFractionDigits,
  maxFractionDigits: () => props.maxFractionDigits,
  useGrouping: () => props.useGrouping,
  prefix: () => props.prefix,
  suffix: () => props.suffix,
})

const messages = useUiMessages()
const fieldControl = useFieldControl()
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

const displayValue = shallowRef(numberFormat.format(modelValue.value))
const isFocused = shallowRef(false)

// Resync display on external model writes (reset, programmatic set); skip if focused (avoid fighting caret).
watch(modelValue, (value) => {
  if (isFocused.value) return
  displayValue.value = numberFormat.format(value)
})

watch(displayValue, (text) => {
  if (text === '') {
    modelValue.value = null
    return
  }
  const parsed = numberFormat.parse(text)
  if (parsed !== null) modelValue.value = parsed
})

function onBeforeInput(event: InputEvent) {
  if (isDisabled.value || props.readonly || !event.data) return
  const target = event.target as HTMLInputElement
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? target.value.length
  const next = target.value.slice(0, start) + event.data + target.value.slice(end)
  if (!numberFormat.isPartial(next) && numberFormat.parse(next) === null) {
    event.preventDefault()
  }
}

function decimalPlacesOf(n: number): number {
  if (!Number.isFinite(n)) return 0
  const s = Math.abs(n).toString()
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
}
const decimalPlaces = computed(() =>
  Math.max(decimalPlacesOf(props.step), props.maxFractionDigits ?? 0),
)

function clamp(value: number): number {
  let v = value
  if (props.min !== undefined) v = Math.max(props.min, v)
  if (props.max !== undefined) v = Math.min(props.max, v)
  return v
}

function applyStep(delta: number) {
  if (isDisabled.value || props.readonly) return
  const decimals = decimalPlaces.value
  const scale = 10 ** decimals
  const base = modelValue.value ?? props.min ?? 0
  const next = clamp(Math.round(base * scale + delta * scale) / scale)
  modelValue.value = next
  displayValue.value = numberFormat.format(next)
}

function increment() {
  applyStep(props.step)
}
function decrement() {
  applyStep(-props.step)
}

function onKeydown(event: KeyboardEvent) {
  if (isDisabled.value || props.readonly) return
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      applyStep(props.step)
      break
    case 'ArrowDown':
      event.preventDefault()
      applyStep(-props.step)
      break
    case 'Home':
      if (props.min !== undefined) {
        event.preventDefault()
        modelValue.value = props.min
        displayValue.value = numberFormat.format(props.min)
      }
      break
    case 'End':
      if (props.max !== undefined) {
        event.preventDefault()
        modelValue.value = props.max
        displayValue.value = numberFormat.format(props.max)
      }
      break
  }
}

// Press-and-hold: instant feedback on pointerdown, then 500ms delay before 60ms repeats.
let holdTimeout: ReturnType<typeof setTimeout> | undefined
let repeatInterval: ReturnType<typeof setInterval> | undefined
function clearRepeat() {
  if (holdTimeout !== undefined) clearTimeout(holdTimeout)
  if (repeatInterval !== undefined) clearInterval(repeatInterval)
  holdTimeout = undefined
  repeatInterval = undefined
}
function onStepperDown(delta: number) {
  clearRepeat()
  applyStep(delta)
  holdTimeout = setTimeout(() => {
    repeatInterval = setInterval(() => applyStep(delta), 60)
  }, 500)
}
function onStepperUp() {
  clearRepeat()
}
onScopeDispose(clearRepeat)

// Only reformat/clamp-on-blur here; focus/blur reported by Input's useFieldControl.
function onFocus() {
  isFocused.value = true
}
function onBlur() {
  isFocused.value = false
  let value = modelValue.value
  if (value === null) {
    if (!props.allowEmpty) {
      value = props.min ?? 0
      modelValue.value = value
    }
  } else {
    const clamped = clamp(value)
    if (clamped !== value) {
      value = clamped
      modelValue.value = clamped
    }
  }
  displayValue.value = numberFormat.format(value)
}

const showColumnControls = computed(() => props.controls && props.stepperPosition === 'end')
const showSplitControls = computed(() => props.controls && props.stepperPosition === 'split')

const atMax = computed(
  () => props.max !== undefined && modelValue.value !== null && modelValue.value >= props.max,
)
const atMin = computed(
  () => props.min !== undefined && modelValue.value !== null && modelValue.value <= props.min,
)

const inputRef = useTemplateRef('inputRef')
const el = computed(() => inputRef.value?.el ?? null)
const inputEl = computed(() => inputRef.value?.inputEl ?? null)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.inputNumber,
  () => props.ui,
)
const innerUi = computed(() => ({ root: themedUi()?.root, input: themedUi()?.input }))
const incPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.increment,
    'ui-input-number-stepper',
    'ui-input-number-stepper--inc',
    showSplitControls.value && 'ui-input-number-stepper--split',
  ),
)
const decPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.decrement,
    'ui-input-number-stepper',
    'ui-input-number-stepper--dec',
    showSplitControls.value && 'ui-input-number-stepper--split',
  ),
)

defineExpose({ el, inputEl, increment, decrement })
</script>
