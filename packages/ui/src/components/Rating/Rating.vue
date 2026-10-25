<template>
  <div
    :id="fieldControl.id"
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    role="slider"
    :tabindex="isDisabled ? -1 : 0"
    aria-orientation="horizontal"
    :aria-valuenow="modelValue"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuetext="resolveValueText(modelValue)"
    :aria-disabled="isDisabled || undefined"
    :aria-readonly="readonly || undefined"
    :aria-invalid="fieldControl.invalid() || undefined"
    :aria-describedby="fieldControl.describedBy()"
    :aria-labelledby="fieldControl.labelledBy()"
    :data-tracking="isTracking || undefined"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeydown"
    @focus="onFocus"
    @blur="onBlur"
    v-bind="restAttrs"
  >
    <span
      class="ui-rating-track"
      :data-pop="committedKey ? (committedKey % 2 ? 'a' : 'b') : undefined"
    >
      <span
        v-for="index in max"
        :key="index"
        ref="itemEls"
        :class="itemPart.class"
        :style="[itemPart.style, { '--ui-rating-fill': `${fillPercent(index - 1)}%` }]"
      >
        <svg class="ui-rating-icon ui-rating-icon--empty" viewBox="0 0 256 256" aria-hidden="true">
          <path :d="STAR_PATH" />
        </svg>
        <svg class="ui-rating-icon ui-rating-icon--filled" viewBox="0 0 256 256" aria-hidden="true">
          <path :d="STAR_PATH" />
        </svg>
      </span>
    </span>
    <input v-if="name" type="hidden" :name="name" :value="modelValue" />
  </div>
</template>

<!-- Single ARIA-slider control (not N focusable radios), same interaction model as Slider.vue: pointer sets/drags the value, arrow keys step it. Hover/drag preview is instant (no transition, `data-tracking`); a committed change (click, drag release, keyboard) gets the fill sweep + pop, restarted by flipping between two copies of its keyframes, so the pop never plays on first paint and the stars are never remounted. -->
<script setup lang="ts">
import './Rating.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { inlineKey, isRtl } from '../../composables/dom'
import { useFieldControl } from '../../composables/useFieldControl'
import {
  clearFocusVisible,
  markFocusVisible,
  showFocusVisible,
} from '../../composables/useFocusVisible'
import { omitAttrs, useForwardedListener } from '../../composables/forwardedListeners'
import { useFormReset } from '../../composables/useFormReset'
import { useMessages, ratingMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { RatingMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const STAR_PATH =
  'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z'

const attrs = useAttrs()
const forward = useForwardedListener(attrs)
const restAttrs = computed(() =>
  omitAttrs(attrs, [
    'onPointerenter',
    'onPointermove',
    'onPointerleave',
    'onPointerdown',
    'onPointerup',
    'onPointercancel',
    'onKeydown',
    'onFocus',
    'onBlur',
  ]),
)
/** Current rating; `0` means unrated. @default 0 */
const modelValue = defineModel<number>({ default: 0 })

const rawProps = withDefaults(
  defineProps<{
    /** Number of stars, which is also the highest rating. @default 5 */
    max?: number
    /** Half-star precision, for both pointer and keyboard (arrow keys step by `0.5`). @default false */
    allowHalf?: boolean
    /** Shows the rating but ignores pointer and keyboard input. Stays focusable. @default false */
    readonly?: boolean
    /** Disables the rating and blocks interaction. @default false */
    disabled?: boolean
    /** Control size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Native `name` for form submission, via a hidden input. */
    name?: string
    /** Drives `aria-valuetext`. Defaults to the `rating.valueText` message ("{value} of {max}"). */
    valueText?: (value: number) => string
    /**
     * How it moves: its appearance, star by star (`{ initial: { item: { opacity: 0, scale: 0.6 } }, stagger: 0.04 }`),
     * and its states (`{ states: { disabled: { root: { opacity: 0.5 } } } }`). `false` turns its own
     * animation off, the built-in fill sweep and commit pop too.
     * @default true
     */
    motion?: RatingMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; item: UiPartValue }>
  }>(),
  { max: 5, allowHalf: false, readonly: false, disabled: false, motion: undefined },
)
const props = withProviderDefaults(rawProps, { size: 'md', motion: true })

const fieldControl = useFieldControl({ filled: () => modelValue.value > 0 })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

const messages = useMessages({ rating: ratingMessages })
function resolveValueText(value: number): string {
  if (props.valueText) return props.valueText(value)
  return messages.value.rating.valueText
    .replace('{value}', String(value))
    .replace('{max}', String(props.max))
}

const step = computed(() => (props.allowHalf ? 0.5 : 1))
function clamp(value: number): number {
  const snapped = Math.round(value / step.value) * step.value
  return Math.min(props.max, Math.max(0, snapped))
}

// Hover/drag shows a live preview without touching the committed model —
// clearing it on pointerleave reverts the display back to modelValue. The
// preview is visual only: ARIA always reports the committed value.
const hoverValue = shallowRef<number | null>(null)
const isTracking = shallowRef(false)
const displayValue = computed(() => hoverValue.value ?? modelValue.value)

// Each commit flips `data-pop` between two copies of the pop, which restarts it without remounting
// the stars (your animations hold them); mounting with an existing value never pops.
const committedKey = shallowRef(0)
function commit(value: number) {
  const next = clamp(value)
  if (next !== modelValue.value) committedKey.value++
  modelValue.value = next
}

const root = useTemplateRef<HTMLElement>('root')
useFormReset(modelValue, () => root.value)
// One element per star — an external animation library needs real nodes to stagger-reveal,
// wobble, or morph individual stars, not just the row as a whole.
const itemEls = useTemplateRef<HTMLElement[]>('itemEls')
const parts = useStateMotion({
  key: 'rating',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-rating', item: '.ui-rating-item' },
  states: () => ({ disabled: isDisabled.value }),
})
function valueFromPointer(event: PointerEvent): number {
  const rect = root.value!.getBoundingClientRect()
  // Right to left, the stars count from the right edge.
  const from = isRtl(root.value) ? rect.right - event.clientX : event.clientX - rect.left
  const fraction = rect.width === 0 ? 0 : from / rect.width
  const raw = Math.max(0, Math.min(1, fraction)) * props.max
  return props.allowHalf ? Math.ceil(raw * 2) / 2 : Math.ceil(raw)
}

function onPointerEnter(event: PointerEvent) {
  try {
    if (isDisabled.value || props.readonly) return
    hoverValue.value = valueFromPointer(event)
  } finally {
    forward('onPointerenter', event)
  }
}
function onPointerMove(event: PointerEvent) {
  try {
    if (isDisabled.value || props.readonly) return
    hoverValue.value = valueFromPointer(event)
    if (isTracking.value) commit(hoverValue.value)
  } finally {
    forward('onPointermove', event)
  }
}
function onPointerLeave(event: PointerEvent) {
  try {
    hoverValue.value = null
  } finally {
    forward('onPointerleave', event)
  }
}
function onPointerDown(event: PointerEvent) {
  try {
    if (isDisabled.value || props.readonly) return
    root.value?.setPointerCapture(event.pointerId)
    isTracking.value = true
    commit(valueFromPointer(event))
    root.value?.focus()
  } finally {
    forward('onPointerdown', event)
  }
}
function onPointerUp(event: PointerEvent) {
  try {
    isTracking.value = false
  } finally {
    forward('onPointerup', event)
  }
}
function onPointerCancel(event: PointerEvent) {
  try {
    isTracking.value = false
  } finally {
    forward('onPointercancel', event)
  }
}
function onFocus(event: FocusEvent) {
  try {
    markFocusVisible(event)
    fieldControl.onFocus()
  } finally {
    forward('onFocus', event)
  }
}
function onBlur(event: FocusEvent) {
  try {
    clearFocusVisible(event)
    fieldControl.onBlur()
  } finally {
    forward('onBlur', event)
  }
}

function onKeydown(event: KeyboardEvent) {
  try {
    showFocusVisible(event)
    if (isDisabled.value || props.readonly) return
    // A resting pointer's preview would otherwise mask the keyboard change until it moves.
    if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      hoverValue.value = null
    }
    switch (inlineKey(event.key, event.currentTarget as Element)) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault()
        commit(modelValue.value + step.value)
        return
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault()
        commit(modelValue.value - step.value)
        return
      case 'Home':
        event.preventDefault()
        commit(0)
        return
      case 'End':
        event.preventDefault()
        commit(props.max)
        return
    }
  } finally {
    forward('onKeydown', event)
  }
}

function fillPercent(index: number): number {
  const fraction = Math.max(0, Math.min(1, displayValue.value - index))
  return fraction * 100
}

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.rating,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-rating',
    `ui-rating--${props.size}`,
    isDisabled.value && 'ui-rating--disabled',
    props.readonly && 'ui-rating--readonly',
    !props.motion && 'ui-rating--no-motion',
  ),
)
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-rating-item'))

defineExpose({
  /** Root element. */
  el: root,
  /** Star elements, one per star. */
  itemEls,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
