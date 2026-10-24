<template>
  <Input
    ref="inputRef"
    v-model="displayValue"
    type="text"
    :inputmode="inputMode"
    autocomplete="off"
    role="spinbutton"
    :size="props.size"
    :disabled="isDisabled"
    :readonly="readonly"
    :invalid="isInvalid"
    :placeholder="placeholder"
    :name="name"
    :ui="innerUi"
    :aria-valuenow="modelValue ?? undefined"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :data-ui-roll="animated || undefined"
    :data-ui-scrub="scrubPx ? (scrubbing ? 'active' : '') : undefined"
    @beforeinput="onBeforeInput"
    @pointerdown="onInputPointerdown"
    @pointermove="onScrubMove"
    @pointerup="onScrubEnd"
    @pointercancel="onScrubEnd"
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
    <template v-if="$slots.display || animated" #display="displayProps">
      <slot name="display" v-bind="displayProps">
        <template v-if="rolling"
          >{{ prefix
          }}<LazyAnimatedNumber
            :value="modelValue!"
            :locale="props.locale"
            :format="numberFormat.formatOptions.value"
          />{{ suffix }}</template
        >
        <span v-else-if="displayValue">{{ displayValue }}</span>
        <span v-else class="ui-input-display-placeholder">{{ placeholder }}</span>
      </slot>
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
  Model commits live on full parse or null (clearing unambiguous); blur and Enter reformat + clamp.
  Steppers: tabindex=-1 (arrows on input), decimal-safe math (0.1 + 0.2 = 0.3).
  Press-and-hold repeats (500ms delay, 60ms thereafter); pointerdown for instant feedback.
  Comments outside template to avoid DOM nodes in production.
-->
<script setup lang="ts">
import './InputNumber.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import Input from '../Input/Input.vue'
import LazyAnimatedNumber from '../internal/LazyAnimatedNumber.vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { useNumberFormat } from '../../composables/useNumberFormat'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { InputNumberMotion } from '../../motion/types'

/** Numeric value; `null` when the field is empty. @default null */
const modelValue = defineModel<number | null>({ default: null })

const rawProps = withDefaults(
  defineProps<{
    /** Lowest allowed value; blur, Enter and the steppers clamp the value to it. */
    min?: number
    /** Highest allowed value; blur, Enter and the steppers clamp the value to it. */
    max?: number
    /** Amount the steppers and the arrow keys add or remove. @default 1 */
    step?: number
    /** BCP-47 locale for formatting and parsing numbers. When unset, the runtime locale applies. */
    locale?: string
    /** Number format: plain decimal, currency (needs `currency`) or percent. @default 'decimal' */
    mode?: 'decimal' | 'currency' | 'percent'
    /** ISO 4217 currency code; required when `mode` is `'currency'`. */
    currency?: string
    /** Minimum number of decimal places shown. */
    minFractionDigits?: number
    /** Maximum number of decimal places shown. */
    maxFractionDigits?: number
    /** Shows locale grouping separators, such as thousands commas. @default true */
    useGrouping?: boolean
    /** Literal text before the formatted number, outside Intl formatting, such as a unit label. */
    prefix?: string
    /** Literal text after the formatted number, such as a unit label. */
    suffix?: string
    /** Shows the increment and decrement buttons. @default true */
    controls?: boolean
    /**
     * `'end'` stacks a +/- column after the value; `'split'` puts one full-height button on each side.
     * @default 'end'
     */
    stepperPosition?: 'end' | 'split'
    /** When `false`, blurring an empty field sets the value to `min ?? 0` instead of `null`. @default true */
    allowEmpty?: boolean
    /** Control size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Disables the input and blocks interaction. A disabled parent Field also disables it. @default false */
    disabled?: boolean
    /** Makes the value read-only while keeping it focusable and selectable. @default false */
    readonly?: boolean
    /** Standalone override; ORed with the nearest Field's `error` state. @default false */
    invalid?: boolean
    /** Text shown while the input is empty. */
    placeholder?: string
    /** Native `name` on the input; a plain `<form>` submits the formatted text. */
    name?: string
    /**
     * Drag sideways on the field, while you're not typing in it, to change the value: one `step`
     * per this many pixels, ten with Shift held. `true` is 4 px. A click without a drag still
     * focuses the field for typing.
     * @default false
     */
    scrub?: boolean | number
    /**
     * Rolls the digits to each new value from the steppers, the arrow keys or your code, like
     * AnimatedNumber. Typing shows the plain input. @default false
     */
    animated?: boolean
    /**
     * How it moves: its appearance (`{ initial: { root: { opacity: 0, y: 4 } } }`) and its states
     * (`{ states: { invalid: { root: { x: [0, -6, 6, 0] } } } }`). `false` turns its own animation
     * off.
     */
    motion?: InputNumberMotion
    /** Class and style overrides for each part. */
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
    disabled: false,
    readonly: false,
    invalid: false,
    animated: false,
    scrub: false,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)
const props = withProviderDefaults(rawProps, { size: 'md', locale: undefined })

defineSlots<{
  /** Inline leading content, before the value and the `'split'` mode decrement button. */
  start(): unknown
  /** Inline trailing content, before the stepper buttons. */
  end(): unknown
  /**
   * Draws the text yourself over the field's own text, as Input's `#display`; it replaces the
   * rolling digits of `animated`. `value` is the formatted text.
   */
  display(props: { value: string; placeholder: string; focused: boolean }): unknown
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
// iPhone number pads have no minus key, so a range that may go negative gets the full keyboard.
const inputMode = computed(() => {
  if (props.min === undefined || props.min < 0) return 'text'
  if (props.maxFractionDigits === 0 && props.min !== undefined) return 'numeric'
  return 'decimal'
})

const displayValue = shallowRef(numberFormat.format(modelValue.value))
const isFocused = shallowRef(false)
// Typing shows the plain input; a step, Home/End, Enter or blur hands back to the rolling digits.
const typing = shallowRef(false)

// Resync on external model writes and on format changes (locale, currency); skip if focused (avoid fighting caret).
watch(
  () => numberFormat.format(modelValue.value),
  (text) => {
    if (!isFocused.value) {
      displayValue.value = text
      typing.value = false
    }
  },
)

watch(displayValue, (text) => {
  if (text === '') {
    modelValue.value = null
    return
  }
  const parsed = numberFormat.parse(text)
  if (parsed !== null) modelValue.value = parsed
})

function onBeforeInput(event: InputEvent) {
  typing.value = true
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
  typing.value = false
  modelValue.value = next
  displayValue.value = numberFormat.format(next)
}

function increment() {
  applyStep(props.step)
}
function decrement() {
  applyStep(-props.step)
}

// Scrub: a drag from an unfocused field steps the value; a click without one focuses it.
const scrubPx = computed(() => (props.scrub === true ? 4 : props.scrub || 0))
const scrubbing = shallowRef(false)
let drag: { x: number; base: number; moved: boolean } | null = null
function onInputPointerdown(event: PointerEvent) {
  const canScrub =
    scrubPx.value && !isFocused.value && !isDisabled.value && !props.readonly && event.button === 0
  if (!canScrub) {
    typing.value = true
    return
  }
  event.preventDefault()
  try {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  } catch {
    // An untrusted event has no active pointer to capture.
  }
  drag = { x: event.clientX, base: modelValue.value ?? props.min ?? 0, moved: false }
}
function onScrubMove(event: PointerEvent) {
  if (!drag) return
  const dx = event.clientX - drag.x
  if (!drag.moved && Math.abs(dx) < 3) return
  drag.moved = true
  scrubbing.value = true
  const steps = Math.trunc(dx / scrubPx.value) * (event.shiftKey ? 10 : 1)
  const decimals = decimalPlaces.value
  const scale = 10 ** decimals
  const next = clamp(Math.round(drag.base * scale + steps * props.step * scale) / scale)
  if (next === modelValue.value) return
  typing.value = false
  modelValue.value = next
  displayValue.value = numberFormat.format(next)
}
function onScrubEnd(event: PointerEvent) {
  if (!drag) return
  const clicked = !drag.moved && event.type === 'pointerup'
  drag = null
  scrubbing.value = false
  if (clicked) {
    typing.value = true
    inputEl.value?.focus()
  }
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
        typing.value = false
        modelValue.value = props.min
        displayValue.value = numberFormat.format(props.min)
      }
      break
    case 'Enter':
      commit()
      break
    case 'End':
      if (props.max !== undefined) {
        event.preventDefault()
        typing.value = false
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

// Only reformat/clamp on blur and Enter here; focus/blur reported by Input's useFieldControl.
function onFocus() {
  isFocused.value = true
}
function onBlur() {
  isFocused.value = false
  commit()
}
// Enter commits like blur: clamp to min/max and reformat.
function commit() {
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
  typing.value = false
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
const parts = useStateMotion({
  key: 'inputNumber',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => el.value,
  selectors: {
    root: '.ui-input',
    input: '.ui-input-el',
    increment: '.ui-input-number-stepper--inc',
    decrement: '.ui-input-number-stepper--dec',
  },
  states: () => ({ invalid: isInvalid.value, disabled: isDisabled.value }),
})

const rolling = computed(
  () =>
    props.animated &&
    !typing.value &&
    modelValue.value !== null &&
    displayValue.value === numberFormat.format(modelValue.value),
)

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
    `ui-input-number-stepper--${props.size}`,
    'ui-input-number-stepper--inc',
    showSplitControls.value && 'ui-input-number-stepper--split',
  ),
)
const decPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.decrement,
    'ui-input-number-stepper',
    `ui-input-number-stepper--${props.size}`,
    'ui-input-number-stepper--dec',
    showSplitControls.value && 'ui-input-number-stepper--split',
  ),
)

defineExpose({
  /** Root element (the frame around the input). */
  el,
  /** Native `<input>` element. */
  inputEl,
  /** Adds one `step`, clamped to `max`. No-op when disabled or read-only. */
  increment,
  /** Subtracts one `step`, clamped to `min`. No-op when disabled or read-only. */
  decrement,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
