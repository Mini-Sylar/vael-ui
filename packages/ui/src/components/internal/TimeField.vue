<template>
  <span class="ui-time-field" :data-disabled="disabled || undefined">
    <input
      ref="inputEl"
      class="ui-time-field-input"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      role="spinbutton"
      :aria-label="label"
      :aria-valuenow="modelValue"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuetext="displayText"
      :disabled="disabled"
      :value="displayText"
      @focus="onFocus"
      @beforeinput="onBeforeInput"
      @keydown="onKeydown"
    />
    <span class="ui-time-field-steppers">
      <button
        type="button"
        tabindex="-1"
        class="ui-time-field-stepper"
        :disabled="disabled"
        :aria-label="incLabel"
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
        class="ui-time-field-stepper"
        :disabled="disabled"
        :aria-label="decLabel"
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
  </span>
</template>

<!-- A wrap-around numeric spinbutton for one clock segment (hour or minute) —
     InputNumber clamps at its bounds, a clock wraps (23 + 1 -> 0, 1 - 1 -> 12),
     which is different enough stepping math that reusing InputNumber directly
     would mean overriding its core clamp behavior anyway. Typing digits commits
     immediately per keystroke (a clock segment has no "in-progress" partial
     state worth waiting on) rather than buffering like OtpInput's cells. -->
<script setup lang="ts">
import './TimeField.css'
import { computed, onScopeDispose, useTemplateRef } from 'vue'

const modelValue = defineModel<number>({ required: true })

const props = withDefaults(
  defineProps<{
    min: number
    max: number
    step?: number
    pad?: number
    label?: string
    incLabel?: string
    decLabel?: string
    disabled?: boolean
  }>(),
  {
    step: 1,
    pad: 2,
    label: undefined,
    incLabel: 'Increase',
    decLabel: 'Decrease',
    disabled: false,
  },
)

const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
defineExpose({ inputEl })

const displayText = computed(() => String(modelValue.value).padStart(props.pad, '0'))

function wrap(value: number): number {
  const span = props.max - props.min + 1
  return ((((value - props.min) % span) + span) % span) + props.min
}
function applyStep(delta: number) {
  if (props.disabled) return
  modelValue.value = wrap(modelValue.value + delta)
}

function onFocus(event: FocusEvent) {
  ;(event.target as HTMLInputElement).select()
}

// Typed digits commit as soon as a value is unambiguous — e.g. typing "6" for
// a minute (max 59) can't extend to a valid two-digit value starting with 6,
// so it commits right away instead of waiting out a timer.
let typedBuffer = ''
let typedTimer: ReturnType<typeof setTimeout> | undefined
function resetBuffer() {
  clearTimeout(typedTimer)
  typedBuffer = ''
}
function onBeforeInput(event: InputEvent) {
  event.preventDefault()
  if (props.disabled || !event.data || !/^[0-9]$/.test(event.data)) return
  clearTimeout(typedTimer)
  typedBuffer = (typedBuffer.length >= props.pad ? '' : typedBuffer) + event.data
  const typed = Number(typedBuffer)
  modelValue.value = Math.min(props.max, Math.max(props.min, typed))
  const canExtend = typedBuffer.length < props.pad && typed * 10 <= props.max
  if (canExtend) typedTimer = setTimeout(resetBuffer, 800)
  else typedBuffer = ''
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      resetBuffer()
      applyStep(props.step)
      return
    case 'ArrowDown':
      event.preventDefault()
      resetBuffer()
      applyStep(-props.step)
      return
    case 'Home':
      event.preventDefault()
      resetBuffer()
      modelValue.value = props.min
      return
    case 'End':
      event.preventDefault()
      resetBuffer()
      modelValue.value = props.max
      return
    default:
      return
  }
}

// Press-and-hold: instant feedback on pointerdown, then a delay before repeating —
// same timing as InputNumber's own stepper buttons.
let holdTimeout: ReturnType<typeof setTimeout> | undefined
let repeatInterval: ReturnType<typeof setInterval> | undefined
function clearRepeat() {
  clearTimeout(holdTimeout)
  clearInterval(repeatInterval)
  holdTimeout = undefined
  repeatInterval = undefined
}
function onStepperDown(delta: number) {
  clearRepeat()
  resetBuffer()
  applyStep(delta)
  holdTimeout = setTimeout(() => {
    repeatInterval = setInterval(() => applyStep(delta), 60)
  }, 500)
}
function onStepperUp() {
  clearRepeat()
}
onScopeDispose(clearRepeat)
</script>
