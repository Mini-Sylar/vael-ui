<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[sliderStyle, rootPart.style]"
    :data-dragging="isDragging || undefined"
    :data-instant="isInstant || undefined"
    :data-motion="props.motion === false ? 'off' : undefined"
    :data-range="isRangeModel || undefined"
    :data-invalid="isInvalid || undefined"
    :aria-disabled="isDisabled || undefined"
    v-bind="rootAttrs"
  >
    <div
      ref="trackEl"
      :class="trackPart.class"
      :style="trackPart.style"
      @pointerdown="onTrackPointerdown"
    >
      <div ref="fillEl" :class="fillPart.class" :style="fillPart.style" aria-hidden="true" />
      <slot name="track" :values="thumbValues" :percents="thumbPercents" :dragging="isDragging" />
      <span
        v-for="(value, index) in thumbValues"
        :key="index"
        ref="thumbEls"
        :id="thumbId(index)"
        :class="thumbPart.class"
        :style="thumbPart.style"
        role="slider"
        :tabindex="isDisabled ? -1 : 0"
        :data-index="index"
        :data-active="activeThumb === index || undefined"
        :aria-valuenow="value"
        :aria-valuemin="thumbMin(index)"
        :aria-valuemax="thumbMax(index)"
        :aria-valuetext="valueText ? valueText(value) : undefined"
        :aria-orientation="orientation === 'vertical' ? 'vertical' : undefined"
        :aria-disabled="isDisabled || undefined"
        :aria-label="thumbLabel(index)"
        :aria-labelledby="thumbLabelledBy(index)"
        :aria-describedby="describedBy"
        @pointerdown.stop="onThumbPointerdown(index, $event)"
        @keydown="(event: KeyboardEvent) => onThumbKeydownWithRing(index, event)"
        @focus="onThumbFocus"
        @blur="onThumbBlur"
      >
        <slot
          name="thumb"
          :value="value"
          :index="index"
          :percent="thumbPercents[index] ?? 0"
          :active="activeThumb === index"
          :dragging="isDragging"
        />
      </span>
    </div>
    <template v-if="name">
      <input
        v-for="(value, index) in thumbValues"
        :key="`hidden-${index}`"
        type="hidden"
        :name="name"
        :value="value"
      />
    </template>
  </div>
</template>

<!-- Range or single via tuple/number model; no live-drag transitions, custom properties for CSS positioning -->
<script setup lang="ts">
import './Slider.css'
import '../shared/tokens.css'
import { computed, nextTick, useAttrs, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { omitAttrs } from '../../composables/forwardedListeners'
import {
  clearFocusVisible,
  markFocusVisible,
  showFocusVisible,
} from '../../composables/useFocusVisible'
import { useSlider } from '../../composables/useSlider'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { SliderMotion } from '../../motion/types'
import { useUiMessages } from '../../messages'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
/** Current value. Bind a `[start, end]` tuple for a two-thumb range. @default 0 */
const modelValue = defineModel<number | [number, number]>({ default: 0 })

const emit = defineEmits<{
  /** Fires with the final value when you release a thumb or press a key, like a native range input's `change`. `v-model` updates on every move. */
  change: [value: number | [number, number]]
}>()

const props = withDefaults(
  defineProps<{
    /** Lowest allowed value. @default 0 */
    min?: number
    /** Highest allowed value. @default 100 */
    max?: number
    /** Increment the value snaps to; arrow keys move one step, Page Up/Down ten. @default 1 */
    step?: number
    /** Lays the track out horizontally or vertically. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'
    /** Disables the slider and blocks interaction. @default false */
    disabled?: boolean
    /** Shows the invalid state. A surrounding `Field` in error sets it too. @default false */
    invalid?: boolean
    /** Native `name` for form submission, via one hidden input per thumb. */
    name?: string
    /** Drives `aria-valuetext`, e.g. `(v) => \`$${v}\`` for a currency slider. */
    valueText?: (value: number) => string
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; track: UiPartValue; fill: UiPartValue; thumb: UiPartValue }>
    /** How it moves: its appearance (`{ initial: { thumb: { opacity: 0, scale: 0.6 } } }`) and its states (`{ states: { focus: { thumb: { scale: '1.15' } } } }`). `{ when: 'visible' }` holds its appearance until it scrolls into view. `false` turns its own animation off. */
    motion?: SliderMotion
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    orientation: 'horizontal',
    disabled: false,
    invalid: false,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

const fieldControl = useFieldControl({ filled: () => true })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const messages = useUiMessages()

// The label and description name the focusable thumbs, so the wrapper doesn't get them.
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

const isRangeModel = computed(() => Array.isArray(modelValue.value))
const thumbValues = computed<number[]>(() =>
  isRangeModel.value ? (modelValue.value as [number, number]) : [modelValue.value as number],
)

const thumbPercents = computed(() =>
  thumbValues.value.map((value) =>
    props.max > props.min
      ? Math.min(100, Math.max(0, ((value - props.min) / (props.max - props.min)) * 100))
      : 0,
  ),
)

defineSlots<{
  /** Content inside each thumb, such as a value bubble or an icon. The thumb keeps its role and keyboard handling. */
  thumb(props: {
    value: number
    index: number
    percent: number
    active: boolean
    dragging: boolean
  }): unknown
  /** Content inside the track, under the thumbs, such as ticks or an inline label. */
  track(props: { values: number[]; percents: number[]; dragging: boolean }): unknown
}>()

function thumbId(index: number): string {
  return index === 0 ? fieldControl.id : `${fieldControl.id}-max`
}
// Range thumbs read "Minimum" / "Maximum" after the slider's label, e.g. "Price Minimum".
function thumbLabel(index: number): string | undefined {
  const label = attrs['aria-label'] as string | undefined
  if (!isRangeModel.value) return label
  const part = index === 0 ? messages.value.slider.minimum : messages.value.slider.maximum
  return label && !labelledBy.value ? `${label} ${part}` : part
}
function thumbLabelledBy(index: number): string | undefined {
  if (!labelledBy.value || !isRangeModel.value) return labelledBy.value
  return `${labelledBy.value} ${thumbId(index)}`
}

function thumbMin(index: number): number {
  if (!isRangeModel.value || index === 0) return props.min
  return thumbValues.value[0] ?? props.min
}
function thumbMax(index: number): number {
  if (!isRangeModel.value || index === 1) return props.max
  return thumbValues.value[1] ?? props.max
}

const root = useTemplateRef<HTMLElement>('root')
const trackEl = useTemplateRef<HTMLElement>('trackEl')
const fillEl = useTemplateRef<HTMLElement>('fillEl')
const thumbEls = useTemplateRef<HTMLElement[]>('thumbEls')
const parts = useStateMotion({
  key: 'slider',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: {
    root: '.ui-slider',
    track: '.ui-slider-track',
    fill: '.ui-slider-fill',
    thumb: '.ui-slider-thumb',
  },
  states: () => ({ disabled: isDisabled.value }),
})

const {
  isDragging,
  isInstant,
  activeThumb,
  rootStyle: sliderStyle,
  onThumbPointerdown,
  onThumbKeydown,
  onTrackPointerdown,
} = useSlider(modelValue, {
  trackEl,
  thumbEls,
  min: () => props.min,
  max: () => props.max,
  step: () => props.step,
  orientation: () => props.orientation,
  disabled: () => isDisabled.value,
  // After the parent applies the update, so `change` carries the committed value.
  onCommit: () => nextTick(() => emit('change', modelValue.value)),
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.slider,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-slider',
    `ui-slider--${props.orientation}`,
    isDisabled.value && 'ui-slider--disabled',
  ),
)
const trackPart = computed(() => resolveUiPart(cx, themedUi()?.track, 'ui-slider-track'))
const fillPart = computed(() => resolveUiPart(cx, themedUi()?.fill, 'ui-slider-fill'))
const thumbPart = computed(() => resolveUiPart(cx, themedUi()?.thumb, 'ui-slider-thumb'))

defineExpose({
  /** Root element. */
  el: root,
  /** Track element. */
  trackEl,
  /** Filled portion of the track. */
  fillEl,
  /** Thumb elements, one per value (two in range mode). */
  thumbEls,
  /** `true` while a thumb is being dragged. */
  dragging: isDragging,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})

function onThumbFocus(event: FocusEvent) {
  markFocusVisible(event)
  fieldControl.onFocus()
}
function onThumbBlur(event: FocusEvent) {
  clearFocusVisible(event)
  fieldControl.onBlur()
}
function onThumbKeydownWithRing(index: number, event: KeyboardEvent) {
  showFocusVisible(event)
  onThumbKeydown(index, event)
}
</script>
