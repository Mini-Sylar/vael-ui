<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[sliderStyle, rootPart.style]"
    :data-dragging="isDragging || undefined"
    :data-range="isRangeModel || undefined"
    :data-invalid="isInvalid || undefined"
    :aria-disabled="isDisabled || undefined"
  >
    <div
      ref="trackEl"
      :class="trackPart.class"
      :style="trackPart.style"
      @pointerdown="onTrackPointerdown"
    >
      <div ref="fillEl" :class="fillPart.class" :style="fillPart.style" aria-hidden="true" />
      <span
        v-for="(value, index) in thumbValues"
        :key="index"
        ref="thumbEls"
        :id="index === 0 ? fieldControl.id : undefined"
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
        :aria-describedby="fieldControl.describedBy()"
        :aria-labelledby="fieldControl.labelledBy()"
        @pointerdown.stop="onThumbPointerdown(index, $event)"
        @keydown="onThumbKeydown(index, $event)"
        @focus="fieldControl.onFocus"
        @blur="fieldControl.onBlur"
      />
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
import { computed, useTemplateRef } from 'vue'
import { useFieldControl } from '../composables/useFieldControl'
import { useSlider } from '../composables/useSlider'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const modelValue = defineModel<number | [number, number]>({ default: 0 })

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    orientation?: 'horizontal' | 'vertical'
    disabled?: boolean
    invalid?: boolean
    /** Falls through to hidden `<input>`(s) → plain `<form>` participation. */
    name?: string
    /** Drives `aria-valuetext`, e.g. `(v) => \`$${v}\`` for a currency slider. */
    valueText?: (value: number) => string
    ui?: Partial<{ root: UiPartValue; track: UiPartValue; fill: UiPartValue; thumb: UiPartValue }>
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    orientation: 'horizontal',
    disabled: false,
    invalid: false,
  },
)

const fieldControl = useFieldControl({ filled: () => true })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

const isRangeModel = computed(() => Array.isArray(modelValue.value))
const thumbValues = computed<number[]>(() =>
  isRangeModel.value ? (modelValue.value as [number, number]) : [modelValue.value as number],
)

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

const {
  isDragging,
  activeThumb,
  rootStyle: sliderStyle,
  onThumbPointerdown,
  onThumbKeydown,
  onTrackPointerdown,
} = useSlider(modelValue, {
  trackEl,
  min: () => props.min,
  max: () => props.max,
  step: () => props.step,
  orientation: () => props.orientation,
  disabled: () => isDisabled.value,
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

defineExpose({ el: root, trackEl, fillEl, thumbEls })
</script>
