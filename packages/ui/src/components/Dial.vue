<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[dialRootStyle, rootPart.style]"
    :data-dragging="isDragging || undefined"
    :data-bounded="isBounded || undefined"
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
      :aria-valuetext="ariaValueText"
      :aria-disabled="isDisabled || undefined"
      :aria-describedby="fieldControl.describedBy()"
      :aria-labelledby="fieldControl.labelledBy()"
      @pointerdown="onDialPointerdown"
      @keydown="onDialKeydown"
      @focus="fieldControl.onFocus"
      @blur="fieldControl.onBlur"
    >
      <svg class="ui-dial-arc" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          :class="trackPart.class"
          :style="trackPart.style"
          cx="50"
          cy="50"
          r="42"
          path-length="100"
        />
        <circle
          v-if="isBounded"
          :class="fillPart.class"
          :style="fillPart.style"
          cx="50"
          cy="50"
          r="42"
          path-length="100"
        />
      </svg>
      <svg class="ui-dial-ticks-svg" viewBox="0 0 100 100" aria-hidden="true">
        <g ref="ticksEl" :class="ticksPart.class" :style="ticksPart.style">
          <path
            v-for="(tick, i) in DIAL_TICKS"
            :key="i"
            :class="tick.index ? 'ui-dial-tick ui-dial-tick--index' : 'ui-dial-tick'"
            :d="tick.d"
          />
        </g>
      </svg>
      <span :class="facePart.class" :style="facePart.style">
        <span v-if="showValue" class="ui-dial-value">{{ displayValue }}</span>
      </span>
    </div>
    <input v-if="name" type="hidden" :name="name" :value="modelValue" />
  </div>
</template>

<!--
  Free-spinning counterpart to Knob (no fixed start/end angle).
  useDial tracks angular delta per frame and accumulates (shortest-path wraparound-safe).
  Visual rotation (--ui-dial-rotation) decoupled from value (clamped when min/max set).
  Entire tick ring rotates (spinning marks read "unbounded"); indexed 12-o'clock tick for reference.
  Bounded mode: static full-circle progress ring (like Knob's 270deg fill, but full circle).
  Direct manipulation: live rotation/fill/value never behind CSS transition; only --ui-dial-rotation managed by Vue.
  ARIA: role=slider; aria-valuemin/max absent when unbounded; aria-valuetext always rendered when unbounded.
  Comments outside template to avoid DOM nodes in production.
-->

<script lang="ts">
// Module-scope tick geometry (100x100 viewBox, like Knob's KNOB_ARC_PATH).
// 12 ticks (clock-face) with one longer index tick at 0deg for rotation reference.
function polarPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  // 0deg = straight up, clockwise-positive (matches useDial's atan2 convention).
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

const DIAL_TICK_COUNT = 12
const DIAL_CENTER = 50
const DIAL_TICK_OUTER_R = 41
const DIAL_TICK_INNER_R_MINOR = 35
const DIAL_TICK_INNER_R_MAJOR = 30

function tickPath(deg: number, isIndex: boolean): string {
  const outer = polarPoint(DIAL_CENTER, DIAL_CENTER, DIAL_TICK_OUTER_R, deg)
  const inner = polarPoint(
    DIAL_CENTER,
    DIAL_CENTER,
    isIndex ? DIAL_TICK_INNER_R_MAJOR : DIAL_TICK_INNER_R_MINOR,
    deg,
  )
  return `M ${outer.x.toFixed(3)} ${outer.y.toFixed(3)} L ${inner.x.toFixed(3)} ${inner.y.toFixed(3)}`
}

export const DIAL_TICKS = Array.from({ length: DIAL_TICK_COUNT }, (_, i) => {
  const deg = (360 / DIAL_TICK_COUNT) * i
  const index = i === 0
  return { deg, index, d: tickPath(deg, index) }
})
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useFieldControl } from '../composables/useFieldControl'
import { useDial } from '../composables/useDial'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const modelValue = defineModel<number>({ default: 0 })

const props = withDefaults(
  defineProps<{
    /** Omit either (or both) for a genuinely unbounded value that keeps counting forever in that direction. */
    min?: number
    max?: number
    step?: number
    /** Degrees of pointer rotation per `step` of value change. */
    degreesPerStep?: number
    showValue?: boolean
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    invalid?: boolean
    /** Falls through to a hidden `<input>` → plain `<form>` participation. */
    name?: string
    /** Drives `aria-valuetext`, e.g. `(v) => \`${v} dB\`` for a gain dial. */
    valueText?: (value: number) => string
    ui?: Partial<{
      root: UiPartValue
      dial: UiPartValue
      track: UiPartValue
      fill: UiPartValue
      ticks: UiPartValue
      face: UiPartValue
    }>
  }>(),
  {
    min: undefined,
    max: undefined,
    step: 1,
    degreesPerStep: undefined,
    showValue: true,
    size: 'md',
    disabled: false,
    invalid: false,
  },
)

const fieldControl = useFieldControl({ filled: () => true })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isBounded = computed(() => props.min !== undefined && props.max !== undefined)

const displayValue = computed(() => {
  const decimals = (String(props.step).split('.')[1] ?? '').length
  return decimals > 0 ? modelValue.value.toFixed(decimals) : String(modelValue.value)
})

const ariaValueText = computed(() => {
  if (props.valueText) return props.valueText(modelValue.value)
  // Unbounded: explicit valuetext avoids ARIA's assumed 0-100 fallback.
  return isBounded.value ? undefined : String(modelValue.value)
})

const root = useTemplateRef<HTMLElement>('root')
const dialEl = useTemplateRef<HTMLElement>('dialEl')
const ticksEl = useTemplateRef<SVGGElement>('ticksEl')

const {
  isDragging,
  rootStyle: dialRootStyle,
  onDialPointerdown,
  onDialKeydown,
} = useDial(modelValue, {
  dialEl,
  min: () => props.min,
  max: () => props.max,
  step: () => props.step,
  degreesPerStep: () => props.degreesPerStep,
  disabled: () => isDisabled.value,
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.dial,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-dial',
    `ui-dial--${props.size}`,
    isDisabled.value && 'ui-dial--disabled',
  ),
)
const dialPart = computed(() => resolveUiPart(cx, themedUi()?.dial, 'ui-dial-dial'))
const trackPart = computed(() => resolveUiPart(cx, themedUi()?.track, 'ui-dial-track'))
const fillPart = computed(() => resolveUiPart(cx, themedUi()?.fill, 'ui-dial-fill'))
const ticksPart = computed(() => resolveUiPart(cx, themedUi()?.ticks, 'ui-dial-ticks'))
const facePart = computed(() => resolveUiPart(cx, themedUi()?.face, 'ui-dial-face'))

defineExpose({ el: root, dialEl, ticksEl })
</script>
