<template>
  <div
    ref="root"
    v-bind="attrs"
    :class="rootPart.class"
    :style="[rootPart.style, attrs.style as never]"
    role="slider"
    :tabindex="isDisabled ? -1 : 0"
    aria-orientation="horizontal"
    :aria-valuenow="displayValue"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuetext="resolveValueText(displayValue)"
    :aria-disabled="isDisabled || undefined"
    :aria-readonly="readonly || undefined"
    :aria-describedby="fieldControl.describedBy()"
    :aria-labelledby="fieldControl.labelledBy()"
    :data-tracking="isTracking || undefined"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointerdown="onPointerDown"
    @pointerup="endTracking"
    @pointercancel="endTracking"
    @keydown="onKeydown"
    @focus="fieldControl.onFocus"
    @blur="fieldControl.onBlur"
  >
    <span :key="committedKey" class="ui-rating-track">
      <span
        v-for="index in max"
        :key="index"
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

<!-- Single ARIA-slider control (not N focusable radios), same interaction model as Slider.vue: pointer sets/drags the value, arrow keys step it. Hover/drag preview is instant (no transition, `data-tracking`); a committed change (click, drag release, keyboard) gets the fill sweep + pop, keyed like Badge's animated content so the pop never plays on first paint. -->
<script setup lang="ts">
import './Rating.css'
import '../shared/tokens.css'
import { computed, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const STAR_PATH =
  'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z'

const attrs = useAttrs()
const modelValue = defineModel<number>({ default: 0 })

const props = withDefaults(
  defineProps<{
    max?: number
    /** Half-star precision, for both pointer and keyboard (arrow keys step by 0.5). */
    allowHalf?: boolean
    readonly?: boolean
    disabled?: boolean
    size?: 'sm' | 'md' | 'lg'
    /** Falls through to a hidden `<input>` → plain `<form>` participation. */
    name?: string
    /** Drives `aria-valuetext`. Defaults to the `rating.valueText` message ("{value} of {max}"). */
    valueText?: (value: number) => string
    /** Gates the fill-sweep + commit-pop animation. */
    motionCss?: boolean
    ui?: Partial<{ root: UiPartValue; item: UiPartValue }>
  }>(),
  { max: 5, allowHalf: false, readonly: false, disabled: false, size: 'md', motionCss: true },
)

const fieldControl = useFieldControl({ filled: () => modelValue.value > 0 })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

const messages = useUiMessages()
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
// clearing it on pointerleave reverts the display back to modelValue.
const hoverValue = shallowRef<number | null>(null)
const isTracking = shallowRef(false)
const displayValue = computed(() => hoverValue.value ?? modelValue.value)

// Re-keying the item on every commit restarts its CSS `animation` (same
// technique Badge.vue uses for its pop), skipped on first paint so mounting
// with an existing value never pops.
const committedKey = shallowRef(0)
let mounted = false
function commit(value: number) {
  const next = clamp(value)
  if (mounted && next !== modelValue.value) committedKey.value++
  mounted = true
  modelValue.value = next
}

const root = useTemplateRef<HTMLElement>('root')
function valueFromPointer(event: PointerEvent): number {
  const rect = root.value!.getBoundingClientRect()
  const fraction = rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width
  const raw = Math.max(0, Math.min(1, fraction)) * props.max
  return props.allowHalf ? Math.ceil(raw * 2) / 2 : Math.ceil(raw)
}

function onPointerEnter(event: PointerEvent) {
  if (isDisabled.value || props.readonly) return
  hoverValue.value = valueFromPointer(event)
}
function onPointerMove(event: PointerEvent) {
  if (isDisabled.value || props.readonly) return
  hoverValue.value = valueFromPointer(event)
  if (isTracking.value) commit(hoverValue.value)
}
function onPointerLeave() {
  hoverValue.value = null
}
function onPointerDown(event: PointerEvent) {
  if (isDisabled.value || props.readonly) return
  root.value?.setPointerCapture(event.pointerId)
  isTracking.value = true
  commit(valueFromPointer(event))
  root.value?.focus()
}
function endTracking() {
  isTracking.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (isDisabled.value || props.readonly) return
  switch (event.key) {
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
    !props.motionCss && 'ui-rating--no-motion',
  ),
)
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-rating-item'))

defineExpose({ el: root })
</script>
