<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[knobStyle, rootPart.style]"
    :data-dragging="isDragging || undefined"
    :data-invalid="isInvalid || undefined"
    :aria-disabled="isDisabled || undefined"
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
      :aria-describedby="fieldControl.describedBy()"
      :aria-labelledby="fieldControl.labelledBy()"
      @pointerdown="onDialPointerdown"
      @keydown="onDialKeydown"
      @focus="fieldControl.onFocus"
      @blur="fieldControl.onBlur"
    >
      <svg class="ui-knob-arc" viewBox="0 0 100 100" aria-hidden="true">
        <path :class="trackPart.class" :style="trackPart.style" :d="KNOB_ARC_PATH" />
        <path
          :class="fillPart.class"
          :style="fillPart.style"
          :d="KNOB_ARC_PATH"
          path-length="100"
        />
      </svg>
      <span class="ui-knob-face" />
      <span class="ui-knob-indicator-pivot">
        <span ref="indicatorEl" :class="indicatorPart.class" :style="indicatorPart.style" />
      </span>
    </div>
    <input v-if="name" type="hidden" :name="name" :value="modelValue" />
  </div>
</template>

<!-- Rotary value input: direct manipulation via pointer angle, no live-drag transitions, custom properties for CSS -->

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
import { computed, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { useKnob } from '../../composables/useKnob'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const modelValue = defineModel<number>({ default: 0 })

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    invalid?: boolean
    /** Falls through to a hidden `<input>` → plain `<form>` participation. */
    name?: string
    /** Drives `aria-valuetext`, e.g. `(v) => \`${v} dB\`` for a gain knob. */
    valueText?: (value: number) => string
    ui?: Partial<{
      root: UiPartValue
      dial: UiPartValue
      track: UiPartValue
      fill: UiPartValue
      indicator: UiPartValue
    }>
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    size: 'md',
    disabled: false,
    invalid: false,
  },
)

const fieldControl = useFieldControl({ filled: () => true })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

const root = useTemplateRef<HTMLElement>('root')
const dialEl = useTemplateRef<HTMLElement>('dialEl')
const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')

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

defineExpose({ el: root, dialEl, indicatorEl })
</script>
