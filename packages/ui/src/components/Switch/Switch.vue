<template>
  <label
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="dataState"
    :data-invalid="isInvalid || undefined"
    :data-dragging="dragging || undefined"
    v-bind="rootAttrs"
  >
    <span class="ui-switch-control">
      <input
        ref="inputEl"
        type="checkbox"
        role="switch"
        :id="fieldControl.id"
        class="ui-switch-input"
        :checked="modelValue"
        :disabled="isDisabled"
        :name="name"
        :aria-checked="modelValue"
        :aria-describedby="fieldControl.describedBy()"
        :aria-invalid="isInvalid || undefined"
        :aria-required="fieldControl.required() || undefined"
        @change="onNativeChange"
        @focus="onNativeFocus"
        @blur="onNativeBlur"
        @pointerdown="onDragStart"
        @pointermove="onDragMove"
        @pointerup="onDragEnd"
        @pointercancel="onDragCancel"
        @click="onInputClick"
        v-bind="inputAttrs"
      />
      <span ref="trackEl" :class="trackPart.class" :style="trackPart.style" aria-hidden="true">
        <span ref="thumbEl" :class="thumbPart.class" :style="thumbPart.style" />
      </span>
    </span>
    <span v-if="label || $slots.default" :class="labelPart.class" :style="labelPart.style">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<!-- APG switch pattern via checkbox + role="switch"; no inline style on thumbEl for spring override -->
<script setup lang="ts">
import './Switch.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, nextTick, onMounted, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { useComponentHaptic } from '../../composables/componentHaptic'
import { useFieldControl } from '../../composables/useFieldControl'
import { useControlAttrs } from '../../composables/forwardedListeners'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { SwitchMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const { rootAttrs, inputAttrs } = useControlAttrs(useAttrs())

/** Whether the switch is on. @default false */
const modelValue = defineModel<boolean>({ default: false })

const rawProps = withDefaults(
  defineProps<{
    /** Label text; the default slot replaces it. */
    label?: string
    /** Disables the switch and blocks interaction. @default false */
    disabled?: boolean
    /** Shows the invalid state. A surrounding `Field` in error sets it too. @default false */
    invalid?: boolean
    /** Control size. @default 'md' */
    size?: 'sm' | 'md'
    /** Native `name` for form submission. */
    name?: string
    /**
     * How it moves: its appearance (`{ initial: { thumb: { opacity: 0, scale: 0.6 } } }`) and its
     * states, like `checked`, `dragging` or `invalid` (`{ states: { checked: { thumb: { scale: '1.1' } } } }`).
     * `false` turns its own animation off, built-in transitions too; animate the exposed `trackEl`/`thumbEl` yourself.
     * @default true
     */
    motion?: SwitchMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; track: UiPartValue; thumb: UiPartValue; label: UiPartValue }>
  }>(),
  { disabled: false, invalid: false, motion: undefined },
)
const props = withProviderDefaults(rawProps, { size: 'md', motion: true }, ['sm', 'md'])

defineSlots<{
  /** Label content; replaces the `label` text. */
  default(): unknown
}>()

const fieldControl = useFieldControl({ filled: () => modelValue.value })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

const haptic = useComponentHaptic()
const tick = () => haptic.selection()
function onNativeChange(event: Event) {
  modelValue.value = (event.target as HTMLInputElement).checked
  tick()
}
function onNativeFocus() {
  fieldControl.onFocus()
}
function onNativeBlur() {
  fieldControl.onBlur()
}

// Drag the thumb: it follows the pointer, the track flips as it passes halfway, and it lands on
// the side it's released past. A tap without a drag still toggles.
const dragging = shallowRef(false)
const dragOn = shallowRef<boolean | null>(null)
let drag: { x: number; from: number; travel: number; dir: number; moved: boolean } | null = null
let swallowClick = false
function onDragStart(event: PointerEvent) {
  const track = trackEl.value
  if (isDisabled.value || event.button !== 0 || !track) return
  const travel = track.offsetWidth - track.offsetHeight
  const dir = getComputedStyle(track).direction === 'rtl' ? -1 : 1
  drag = { x: event.clientX, from: modelValue.value ? travel : 0, travel, dir, moved: false }
  try {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  } catch {
    // An untrusted event has no active pointer to capture.
  }
}
function onDragMove(event: PointerEvent) {
  if (!drag || !thumbEl.value) return
  let dx = (event.clientX - drag.x) * drag.dir
  if (!drag.moved) {
    if (Math.abs(dx) < 3) return
    // Track 1:1 from the threshold on, so the thumb doesn't skip its 3px.
    drag.x += 3 * Math.sign(dx) * drag.dir
    dx -= 3 * Math.sign(dx)
  }
  drag.moved = true
  dragging.value = true
  const position = Math.min(drag.travel, Math.max(0, drag.from + dx))
  thumbEl.value.style.translate = `${position * drag.dir}px -50%`
  const on = position > drag.travel / 2
  if (on !== (dragOn.value ?? modelValue.value)) tick()
  dragOn.value = on
}
function endDrag(commit: boolean) {
  if (!drag) return
  const moved = drag.moved
  drag = null
  if (!moved) return
  const next = dragOn.value ?? modelValue.value
  dragging.value = false
  dragOn.value = null
  thumbEl.value?.style.removeProperty('translate')
  if (!commit) return
  // The click that follows the release would toggle it again.
  swallowClick = true
  setTimeout(() => (swallowClick = false))
  modelValue.value = next
}
const onDragEnd = () => endDrag(true)
const onDragCancel = () => endDrag(false)
function onInputClick(event: MouseEvent) {
  if (!swallowClick) return
  swallowClick = false
  event.preventDefault()
}

const dataState = computed(() => ((dragOn.value ?? modelValue.value) ? 'checked' : 'unchecked'))

// First paint only: suppress transitions to prevent initial jump
const firstPaint = shallowRef(true)
onMounted(() => {
  void nextTick(() => {
    firstPaint.value = false
  })
})
const skipTransition = computed(() => firstPaint.value || !props.motion)

const root = useTemplateRef<HTMLElement>('root')
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const trackEl = useTemplateRef<HTMLElement>('trackEl')
const thumbEl = useTemplateRef<HTMLElement>('thumbEl')
const parts = useStateMotion({
  key: 'switch',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-switch', track: '.ui-switch-track', thumb: '.ui-switch-thumb' },
  // `checked` follows the thumb while it's dragged across.
  states: () => ({
    checked: dataState.value === 'checked',
    unchecked: dataState.value !== 'checked',
    invalid: isInvalid.value,
    disabled: isDisabled.value,
    dragging: dragging.value,
  }),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.switch,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-switch',
    `ui-switch--${props.size}`,
    isDisabled.value && 'ui-switch--disabled',
    skipTransition.value && 'ui-switch--no-anim',
  ),
)
const trackPart = computed(() => resolveUiPart(cx, themedUi()?.track, 'ui-switch-track'))
const thumbPart = computed(() => resolveUiPart(cx, themedUi()?.thumb, 'ui-switch-thumb'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-switch-label'))

defineExpose({
  /** Root element. */
  el: root,
  /** Native checkbox input (`role="switch"`). */
  inputEl,
  /** Track element. */
  trackEl,
  /** Thumb element. */
  thumbEl,
  /** Whether the thumb is being dragged. */
  dragging,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
