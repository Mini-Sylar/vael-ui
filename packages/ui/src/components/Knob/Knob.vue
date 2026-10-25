<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[knobStyle, rootPart.style]"
    :data-dragging="isDragging || undefined"
    :data-invalid="isInvalid || undefined"
    :aria-disabled="isDisabled || undefined"
    v-bind="rootAttrs"
  >
    <div
      ref="dialEl"
      :id="fieldControl.id"
      :class="dialPart.class"
      :style="dialPart.style"
      role="slider"
      :tabindex="isDisabled ? -1 : 0"
      :data-active="isDragging || undefined"
      :aria-valuenow="modelValue"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuetext="valueText ? valueText(modelValue) : undefined"
      :aria-disabled="isDisabled || undefined"
      :aria-invalid="isInvalid || undefined"
      :aria-label="attrs['aria-label'] as string | undefined"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy"
      @pointerdown="onDialPointerdown"
      @keydown="onDialKeydownWithRing"
      @focus="onDialFocus"
      @blur="onDialBlur"
    >
      <svg class="ui-knob-arc" viewBox="0 0 100 100" aria-hidden="true">
        <path :class="trackPart.class" :style="trackPart.style" :d="KNOB_ARC_PATH" />
        <path :class="fillPart.class" :style="fillPart.style" :d="KNOB_ARC_PATH" pathLength="100" />
      </svg>
      <span class="ui-knob-face" />
      <span class="ui-knob-indicator-pivot">
        <span ref="indicatorEl" :class="indicatorPart.class" :style="indicatorPart.style" />
      </span>
    </div>
    <input v-if="name" type="hidden" :name="name" :value="modelValue" />
  </div>
</template>

<script lang="ts">
// Fixed 100x100 viewBox + pathLength="100" for simple 0-100 scale on stroke-dashoffset
function polarPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  // 0deg = up, clockwise-positive; matches useKnob's atan2(dx, -dy).
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

const KNOB_ARC_RADIUS = 42
const KNOB_ARC_CENTER = 50
const start = polarPoint(KNOB_ARC_CENTER, KNOB_ARC_CENTER, KNOB_ARC_RADIUS, -135)
const end = polarPoint(KNOB_ARC_CENTER, KNOB_ARC_CENTER, KNOB_ARC_RADIUS, 135)
export const KNOB_ARC_PATH = `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${KNOB_ARC_RADIUS} ${KNOB_ARC_RADIUS} 0 1 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`
</script>

<script setup lang="ts">
import './Knob.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, nextTick, useAttrs, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { omitAttrs } from '../../composables/forwardedListeners'
import {
  clearFocusVisible,
  markFocusVisible,
  showFocusVisible,
} from '../../composables/useFocusVisible'
import { useKnob } from '../../composables/useKnob'
import { useFormReset } from '../../composables/useFormReset'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { KnobMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
/** Current value. @default 0 */
const modelValue = defineModel<number>({ default: 0 })

const emit = defineEmits<{
  /** Fires with the final value when you release the knob or press a key, like a native range input's `change`. `v-model` updates on every move. */
  change: [value: number]
}>()

const props = withDefaults(
  defineProps<{
    /** Lowest allowed value. @default 0 */
    min?: number
    /** Highest allowed value. @default 100 */
    max?: number
    /** Increment the value snaps to; arrow keys move one step, Page Up/Down ten. @default 1 */
    step?: number
    /** Control size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Disables the knob and blocks interaction. @default false */
    disabled?: boolean
    /** Shows the invalid state. A surrounding `Field` in error sets it too. @default false */
    invalid?: boolean
    /** Native `name` for form submission, via a hidden input. */
    name?: string
    /** Drives `aria-valuetext`, e.g. `(v) => \`${v} dB\`` for a gain knob. */
    valueText?: (value: number) => string
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      dial: UiPartValue
      track: UiPartValue
      fill: UiPartValue
      indicator: UiPartValue
    }>
    /** How it moves: its appearance (`{ initial: { root: { opacity: 0, scale: 0.9 } } }`) and its states, like `active` while you turn it (`{ states: { active: { indicator: { scale: '1.2' } } } }`). `false` turns its own animation off. */
    motion?: KnobMotion
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    size: 'md',
    disabled: false,
    invalid: false,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

const fieldControl = useFieldControl({ filled: () => true })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

// The label and description name the focusable dial, so the wrapper doesn't get them.
const rootAttrs = computed(() =>
  omitAttrs(attrs, ['aria-label', 'aria-labelledby', 'aria-describedby']),
)
const labelledBy = computed(
  () => (attrs['aria-labelledby'] as string | undefined) ?? fieldControl.labelledBy(),
)
const describedBy = computed(
  () =>
    [attrs['aria-describedby'], fieldControl.describedBy()].filter(Boolean).join(' ') || undefined,
)

const root = useTemplateRef<HTMLElement>('root')
useFormReset(modelValue, () => root.value)
const dialEl = useTemplateRef<HTMLElement>('dialEl')
const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
const parts = useStateMotion({
  key: 'knob',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: {
    root: '.ui-knob',
    track: '.ui-knob-track',
    fill: '.ui-knob-fill',
    indicator: '.ui-knob-indicator',
  },
  states: () => ({ disabled: isDisabled.value }),
})

const {
  isDragging,
  rootStyle: knobStyle,
  onDialPointerdown,
  onDialKeydown,
} = useKnob(modelValue, {
  dialEl,
  min: () => props.min,
  max: () => props.max,
  step: () => props.step,
  disabled: () => isDisabled.value,
  // After the parent applies the update, so `change` carries the committed value.
  onCommit: () => nextTick(() => emit('change', modelValue.value)),
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.knob,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-knob',
    `ui-knob--${props.size}`,
    isDisabled.value && 'ui-knob--disabled',
  ),
)
const dialPart = computed(() => resolveUiPart(cx, themedUi()?.dial, 'ui-knob-dial'))
const trackPart = computed(() => resolveUiPart(cx, themedUi()?.track, 'ui-knob-track'))
const fillPart = computed(() => resolveUiPart(cx, themedUi()?.fill, 'ui-knob-fill'))
const indicatorPart = computed(() => resolveUiPart(cx, themedUi()?.indicator, 'ui-knob-indicator'))

defineExpose({
  /** Root element. */
  el: root,
  /** Focusable dial element (`role="slider"`). */
  dialEl,
  /** Pointer mark that rotates with the value. */
  indicatorEl,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})

function onDialFocus(event: FocusEvent) {
  markFocusVisible(event)
  fieldControl.onFocus()
}
function onDialBlur(event: FocusEvent) {
  clearFocusVisible(event)
  fieldControl.onBlur()
}
function onDialKeydownWithRing(event: KeyboardEvent) {
  showFocusVisible(event)
  onDialKeydown(event)
}
</script>
