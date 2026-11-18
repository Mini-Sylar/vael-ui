import { onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { inlineKey, isRtl } from './dom'
import { dampen } from './gesture'

export type ResizeDirection = 'horizontal' | 'vertical'

/** Which edge of the panel the handle sits on, and therefore which way a drag GROWS it: `'end'` (the default — a handle on the far/trailing edge, e.g. a left-docked sidebar's right border) grows the panel as the pointer moves toward larger clientX/clientY; `'start'` (a handle on the near/leading edge, e.g. a right-docked panel's left border) flips that. */
export type ResizeEdge = 'start' | 'end'

export interface UseResizableOptions {
  min?: MaybeRefOrGetter<number>
  max?: MaybeRefOrGetter<number>
  direction?: MaybeRefOrGetter<ResizeDirection>
  edge?: MaybeRefOrGetter<ResizeEdge>
  disabled?: MaybeRefOrGetter<boolean>
  /**
   * Snaps to a multiple of `step` on release (the drag itself stays smooth), and an arrow key
   * moves one step. Unset, a drag doesn't snap and an arrow key moves 16 px.
   */
  step?: MaybeRefOrGetter<number | undefined>
  /**
   * Where it starts, for a span such as a timeline bar: a second model beside the size. An
   * `edge: 'start'` handle then moves the start and the size together, so the far end stays put,
   * and `onMovePointerdown` / `onMoveKeydown` move the start alone. A handle pulled past `min`
   * flips the span over its other end, so one press can pull a span out either way.
   */
  offset?: Ref<number>
  /** With `offset`: the span stays within `[start, end]`. */
  bounds?: MaybeRefOrGetter<[number, number] | undefined>
  /** A scrolling container: near its edges it scrolls under the pointer during a drag, and the
   * drag follows. Its `scroll-padding` marks what covers it, such as a sticky column. */
  scrollEl?: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** Fires once per settled interaction (pointer release, or a keyboard step/jump) — mirrors useSlider's onCommit: the "committed" moment, distinct from the live model updates that fire on every drag frame. */
  onCommit?: () => void
}

export interface UseResizableReturn {
  /** True for the entire span of a pointer drag — from pointerdown to release. A move counts
   * from when it first moves, so a still press stays a click. */
  isDragging: Ref<boolean>
  onHandlePointerdown: (event: PointerEvent) => void
  onHandleKeydown: (event: KeyboardEvent) => void
  /** With `offset`: press on the whole span to move it. */
  onMovePointerdown: (event: PointerEvent) => void
  /** With `offset`: the arrow keys move the whole span a step. */
  onMoveKeydown: (event: KeyboardEvent) => void
}

const KEYBOARD_STEP = 16 // px per arrow press — one nominal rem at the default root font-size
// Gentler than pull-to-refresh (wider range spans wider min/max)
const RUBBER_BAND_DAMPEN = 60
// Travel before a press on the whole span becomes a move.
const MOVE_THRESHOLD = 4
// How near the scroll container's edge it starts to scroll, and its top speed per frame.
const EDGE_ZONE = 56
const EDGE_SPEED = 18

// Shifted-log curve (Vaul); springs back via CSS transition.

export function useResizable(
  model: Ref<number>,
  options: UseResizableOptions = {},
): UseResizableReturn {
  const isDragging = shallowRef(false)
  const offset = options.offset

  const min = () => toValue(options.min) ?? 0
  const max = () => toValue(options.max) ?? Infinity
  const direction = () => toValue(options.direction) ?? 'horizontal'
  const edge = () => toValue(options.edge) ?? 'end'
  const isDisabled = () => toValue(options.disabled) ?? false
  const step = () => toValue(options.step) || undefined
  const bounds = () => (offset ? toValue(options.bounds) : undefined) ?? [-Infinity, Infinity]
  const horizontal = () => direction() === 'horizontal'

  // The most the size may be from where it starts: `max`, and the span's end bound.
  const sizeMax = (start: number) => Math.min(max(), bounds()[1] - start)

  function clamp(value: number, start = offset?.value ?? 0): number {
    return Math.min(sizeMax(start), Math.max(min(), value))
  }
  function rubberBand(value: number, hi: number): number {
    const lo = min()
    if (value > hi) return hi + dampen(value - hi, RUBBER_BAND_DAMPEN)
    if (value < lo) return lo - dampen(lo - value, RUBBER_BAND_DAMPEN)
    return value
  }
  const snap = (value: number) => {
    const size = step()
    return size ? Math.round(value / size) * size : value
  }

  type Mode = 'resize' | 'move'
  let mode: Mode = 'resize'
  let pointerId: number | null = null
  let target: HTMLElement | null = null
  // Right to left, the trailing edge is on the left: a drag that grows it moves the other way.
  let mirrored = false
  let moved = false
  let startCoord = 0
  let lastCoord = 0
  let startSize = 0
  let startOffset = 0
  let startScroll = 0
  let scroller: HTMLElement | null = null
  let coverStart = 0
  let coverEnd = 0
  let liveSize = 0
  let liveOffset = 0
  // With `offset`, the end of the span that stays put while a handle pulls the other one.
  let anchor = 0
  let anchorAtEnd = false
  let frame = 0
  let disarmTimer = 0

  const coordOf = (event: { clientX: number; clientY: number }) =>
    horizontal() ? event.clientX : event.clientY
  const scrollOf = (el: HTMLElement | null) =>
    !el ? 0 : horizontal() ? el.scrollLeft : el.scrollTop

  function begin(event: PointerEvent, as: Mode) {
    if (isDisabled() || event.button > 0) return
    mode = as
    pointerId = event.pointerId
    target = event.currentTarget as HTMLElement
    startCoord = lastCoord = coordOf(event)
    mirrored = horizontal() && isRtl(target)
    startSize = liveSize = model.value
    startOffset = liveOffset = offset?.value ?? 0
    scroller = toValue(options.scrollEl) ?? null
    startScroll = scrollOf(scroller)
    if (scroller) {
      const style = getComputedStyle(scroller)
      const pad = (value: string) => Number.parseFloat(value) || 0
      coverStart = pad(horizontal() ? style.scrollPaddingLeft : style.scrollPaddingTop)
      coverEnd = pad(horizontal() ? style.scrollPaddingRight : style.scrollPaddingBottom)
    }
    // A resize starts at once; a move waits for the pointer to travel, so a still press stays a click.
    moved = as === 'resize'
    // No text selection or native link drag; a still press still clicks.
    event.preventDefault()
    if (moved) target.setPointerCapture?.(event.pointerId)
    listen(true)
    isDragging.value = moved
  }

  /** Where the drag puts things now, from the pointer and how far the container has scrolled. */
  function apply() {
    const travel = lastCoord - startCoord + (scrollOf(scroller) - startScroll)
    const delta = travel * (mirrored ? -1 : 1)
    const [lo, hi] = bounds()
    if (mode === 'move') {
      liveOffset = Math.min(Math.max(startOffset + delta, lo), hi - startSize)
      if (offset) offset.value = liveOffset
      return
    }
    if (offset) {
      // The far end stays put. Pulled past `min`, the span flips over it, so a span can be
      // pulled out either way from one press.
      const fromStart = edge() === 'start'
      const reach = startSize + (fromStart ? -delta : delta)
      const m = min()
      const flipped = reach < m
      anchorAtEnd = fromStart !== flipped
      const far = fromStart ? startOffset + startSize : startOffset
      anchor = flipped ? far + (fromStart ? -m : m) : far
      const room = anchorAtEnd ? anchor - lo : hi - anchor
      liveSize = rubberBand(flipped ? 2 * m - reach : reach, Math.min(max(), room))
      liveOffset = anchorAtEnd ? anchor - liveSize : anchor
      offset.value = liveOffset
    } else {
      const signed = edge() === 'end' ? delta : -delta
      liveSize = rubberBand(startSize + signed, sizeMax(startOffset))
    }
    model.value = liveSize
  }

  // Scroll speed this frame: faster the closer the pointer is to the container's edge.
  function edgeSpeed(): number {
    if (!scroller || !moved) return 0
    const box = scroller.getBoundingClientRect()
    const near = (horizontal() ? box.left : box.top) + coverStart
    const far = (horizontal() ? box.right : box.bottom) - coverEnd
    if (lastCoord < near + EDGE_ZONE)
      return -EDGE_SPEED * Math.min(1, (near + EDGE_ZONE - lastCoord) / EDGE_ZONE)
    if (lastCoord > far - EDGE_ZONE)
      return EDGE_SPEED * Math.min(1, (lastCoord - (far - EDGE_ZONE)) / EDGE_ZONE)
    return 0
  }

  // One write a frame, however many pointer events arrive; it keeps ticking only while the
  // container is scrolling under the pointer.
  let lastTick = 0
  function tick(now: number) {
    frame = 0
    if (pointerId === null) return
    // EDGE_SPEED is per 60 Hz frame: scaled by the time since the last, so 120 Hz isn't faster.
    const frames = lastTick ? Math.min(3, Math.max(0, (now - lastTick) * 0.06)) : 1
    const speed = edgeSpeed() * frames
    lastTick = speed ? now : 0
    if (speed && scroller) {
      if (horizontal()) scroller.scrollLeft += speed
      else scroller.scrollTop += speed
    }
    apply()
    if (speed) frame = requestAnimationFrame(tick)
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    lastCoord = coordOf(event)
    if (!moved) {
      if (Math.abs(lastCoord - startCoord) < MOVE_THRESHOLD) return
      moved = true
      isDragging.value = true
      target?.setPointerCapture?.(event.pointerId)
    }
    frame ||= requestAnimationFrame(tick)
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    lastTick = 0
    pointerId = null
    target = null
    scroller = null
    listen(false)
    isDragging.value = false
  }

  function endDrag(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    if (!moved) {
      stop()
      return
    }
    lastCoord = coordOf(event)
    apply()
    stop()
    swallowClick(true)
    settle()
    options.onCommit?.()
  }

  // Release overshoot back within bounds, and onto the step; CSS eases it there.
  function settle() {
    const [lo, hi] = bounds()
    if (mode === 'move') {
      if (offset) offset.value = Math.min(Math.max(snap(liveOffset), lo), hi - model.value)
      return
    }
    if (offset) {
      const room = anchorAtEnd ? anchor - lo : hi - anchor
      const size = Math.min(Math.max(snap(liveSize), min()), max(), room)
      offset.value = anchorAtEnd ? anchor - size : anchor
      model.value = size
      return
    }
    model.value = clamp(snap(liveSize), startOffset)
  }

  /** Puts everything back where the drag found it. */
  function cancel() {
    if (pointerId === null) return
    const wasMoved = moved
    stop()
    if (!wasMoved) return
    model.value = startSize
    if (offset) offset.value = startOffset
    // The button is still down: its release would click the span.
    swallowClick(false)
  }

  // The click a drag's release makes is not a press on the span (or on the span a handle sits
  // in). Armed until that click, or a tick after the release, so it never eats a later click.
  function swallowClick(released: boolean) {
    disarm()
    window.addEventListener('click', onSwallowedClick, true)
    window.addEventListener('pointerdown', disarm, true)
    if (released) disarmTimer = window.setTimeout(disarm)
    else window.addEventListener('pointerup', disarmSoon, true)
  }
  function onSwallowedClick(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    disarm()
  }
  function disarmSoon() {
    window.removeEventListener('pointerup', disarmSoon, true)
    disarmTimer = window.setTimeout(disarm)
  }
  function disarm() {
    clearTimeout(disarmTimer)
    window.removeEventListener('click', onSwallowedClick, true)
    window.removeEventListener('pointerdown', disarm, true)
    window.removeEventListener('pointerup', disarmSoon, true)
  }

  // Escape puts it back. Heard first, so a dialog around it doesn't also close.
  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !moved) return
    event.preventDefault()
    event.stopPropagation()
    cancel()
  }

  function onPointerCancel(event: PointerEvent) {
    if (event.pointerId === pointerId) cancel()
  }

  // Window listeners only for the length of a drag; idle instances add none.
  function listen(on: boolean) {
    const method = on ? 'addEventListener' : 'removeEventListener'
    window[method]('pointermove', onPointerMove as EventListener)
    window[method]('pointerup', endDrag as EventListener)
    window[method]('pointercancel', onPointerCancel as EventListener)
    window[method]('keydown', onKeydown as EventListener, true)
  }

  watch(isDisabled, (disabled) => disabled && cancel())
  onScopeDispose(() => {
    if (pointerId !== null) stop()
    if (typeof window !== 'undefined') disarm()
  })

  function keyDelta(event: KeyboardEvent): number {
    const forwardKey = horizontal() ? 'ArrowRight' : 'ArrowDown'
    const backwardKey = horizontal() ? 'ArrowLeft' : 'ArrowUp'
    const key = inlineKey(event.key, event.currentTarget as Element)
    const amount = step() ?? KEYBOARD_STEP
    return key === forwardKey ? amount : key === backwardKey ? -amount : 0
  }

  function onHandleKeydown(event: KeyboardEvent) {
    if (isDisabled()) return
    const fromStart = edge() === 'start' && offset
    const start = offset?.value ?? 0
    const end = start + model.value
    // The largest it can be: up to `max`, within the bounds on the side the handle moves.
    const top = fromStart ? Math.min(max(), end - bounds()[0]) : sizeMax(start)
    let size: number
    if (event.key === 'Home') size = min()
    // With no max there's nowhere for End to go, so the key passes through.
    else if (event.key === 'End' && Number.isFinite(top)) size = top
    else {
      const delta = keyDelta(event)
      if (!delta) return
      size = model.value + (edge() === 'end' ? delta : -delta)
    }
    event.preventDefault()
    const next = Math.min(Math.max(size, min()), top)
    if (fromStart) offset.value = end - next
    model.value = next
    options.onCommit?.()
  }

  function onMoveKeydown(event: KeyboardEvent) {
    if (isDisabled() || !offset) return
    const delta = keyDelta(event)
    if (!delta) return
    event.preventDefault()
    const [lo, hi] = bounds()
    offset.value = Math.min(Math.max(offset.value + delta, lo), hi - model.value)
    options.onCommit?.()
  }

  return {
    isDragging,
    onHandlePointerdown: (event) => begin(event, 'resize'),
    onHandleKeydown,
    onMovePointerdown: (event) => {
      if (offset) begin(event, 'move')
    },
    onMoveKeydown,
  }
}
