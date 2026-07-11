import { shallowRef, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export type ResizeDirection = 'horizontal' | 'vertical'

/** Which edge of the panel the handle sits on, and therefore which way a drag GROWS it: `'end'` (the default — a handle on the far/trailing edge, e.g. a left-docked sidebar's right border) grows the panel as the pointer moves toward larger clientX/clientY; `'start'` (a handle on the near/leading edge, e.g. a right-docked panel's left border) flips that. */
export type ResizeEdge = 'start' | 'end'

export interface UseResizableOptions {
  min?: MaybeRefOrGetter<number>
  max?: MaybeRefOrGetter<number>
  direction?: MaybeRefOrGetter<ResizeDirection>
  edge?: MaybeRefOrGetter<ResizeEdge>
  disabled?: MaybeRefOrGetter<boolean>
  /** Fires once per settled interaction (pointer release, or a keyboard step/jump) — mirrors useSlider's onCommit: the "committed" moment, distinct from the live model updates that fire on every drag frame. */
  onCommit?: () => void
}

export interface UseResizableReturn {
  /** True for the entire span of a pointer drag — from pointerdown to release. */
  isDragging: Ref<boolean>
  onHandlePointerdown: (event: PointerEvent) => void
  onHandleKeydown: (event: KeyboardEvent) => void
}

const KEYBOARD_STEP = 16 // px per arrow press — one nominal rem at the default root font-size
// Gentler than pull-to-refresh (wider range spans wider min/max)
const RUBBER_BAND_DAMPEN = 60

// Shifted-log curve (Vaul); springs back via CSS transition.
function dampen(overshoot: number): number {
  return RUBBER_BAND_DAMPEN * Math.log(1 + overshoot / RUBBER_BAND_DAMPEN)
}

export function useResizable(
  model: Ref<number>,
  options: UseResizableOptions = {},
): UseResizableReturn {
  const isDragging = shallowRef(false)

  function min(): number {
    return toValue(options.min) ?? 0
  }
  function max(): number {
    return toValue(options.max) ?? Infinity
  }
  function direction(): ResizeDirection {
    return toValue(options.direction) ?? 'horizontal'
  }
  function edge(): ResizeEdge {
    return toValue(options.edge) ?? 'end'
  }
  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }

  function clamp(value: number): number {
    return Math.min(max(), Math.max(min(), value))
  }

  function rubberBand(value: number): number {
    const lo = min()
    const hi = max()
    if (value > hi) return hi + dampen(value - hi)
    if (value < lo) return lo - dampen(lo - value)
    return value
  }

  function coordFrom(event: PointerEvent): number {
    return direction() === 'horizontal' ? event.clientX : event.clientY
  }

  let pointerId: number | null = null
  let startCoord = 0
  let startSize = 0
  let liveSize = 0

  function onHandlePointerdown(event: PointerEvent) {
    if (isDisabled()) return
    event.preventDefault()
    pointerId = event.pointerId
    startCoord = coordFrom(event)
    startSize = model.value
    liveSize = startSize
    isDragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    const delta = coordFrom(event) - startCoord
    const signed = edge() === 'end' ? delta : -delta
    liveSize = rubberBand(startSize + signed)
    model.value = liveSize
  }

  function endDrag(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    pointerId = null
    isDragging.value = false
    // Release overshoot back within bounds; hand-off to CSS.
    model.value = clamp(liveSize)
    options.onCommit?.()
  }

  useEventListener(window, 'pointermove', onPointerMove)
  useEventListener(window, 'pointerup', endDrag)
  useEventListener(window, 'pointercancel', endDrag)

  function onHandleKeydown(event: KeyboardEvent) {
    if (isDisabled()) return
    const forwardKey = direction() === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    const backwardKey = direction() === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    if (event.key === 'Home') {
      event.preventDefault()
      model.value = min()
      options.onCommit?.()
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      model.value = max()
      options.onCommit?.()
      return
    }
    let delta = 0
    if (event.key === forwardKey) delta = KEYBOARD_STEP
    else if (event.key === backwardKey) delta = -KEYBOARD_STEP
    else return
    event.preventDefault()
    const signed = edge() === 'end' ? delta : -delta
    model.value = clamp(model.value + signed)
    options.onCommit?.()
  }

  return { isDragging, onHandlePointerdown, onHandleKeydown }
}
