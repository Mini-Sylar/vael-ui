import { shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrWindow } from '../ssr'

export type SwipeRevealSide = 'leading' | 'trailing'

export interface SwipeCommitInput {
  /** px/ms, magnitude — always >= 0. */
  velocity: number
  /** Net direction of the drag: true if it moved toward the open side. */
  towardOpen: boolean
  /** How far open the panel is at release, as a fraction of the actions panel's own width (0 = closed, 1 = fully open — can be negative or exceed 1 while rubber-banding past either extreme). */
  openFraction: number
}

export interface UseSwipeRevealOptions {
  /** Whether a leading / trailing actions panel exists to reveal toward. */
  leading?: MaybeRefOrGetter<boolean>
  trailing?: MaybeRefOrGetter<boolean>
  /** Px width of each actions panel — its fully-open extreme. Getters; measured off real elements. */
  leadingWidth: MaybeRefOrGetter<number>
  trailingWidth: MaybeRefOrGetter<number>
  disabled?: MaybeRefOrGetter<boolean>
  /** Fires once per settled interaction with the edge that ended up open, or `null` for closed. */
  onCommit?: (openSide: SwipeRevealSide | null) => void
}

export interface UseSwipeRevealReturn {
  /** True for the entire span of a COMMITTED drag (past DRAG_THRESHOLD) —
   * never set for a plain tap, matching useResizable's isDragging shape. */
  isDragging: Ref<boolean>
  /** Live SIGNED px offset for `transform: translateX()`: `>0` leading edge revealed, `<0` trailing, `0` closed. */
  offset: Ref<number>
  /** The revealed (or settling-toward) edge, or `null` when closed. */
  openSide: Ref<SwipeRevealSide | null>
  onContentPointerdown: (event: PointerEvent) => void
  /** Intercepts a tap on the content while open: closes instead of letting the row's own click fire, and swallows the browser's own trailing click that follows a completed drag so a drag-to-open never immediately re-closes itself. */
  onContentClick: (event: MouseEvent) => void
  /** Open a specific edge. With one panel the argument is optional; with both, defaults to `trailing`. */
  reveal: (side?: SwipeRevealSide) => void
  close: () => void
}

// Velocity threshold (Sonner's; Apple's fluid-interface guidance)
const VELOCITY_THRESHOLD = 0.11 // px/ms
// Distance threshold: midpoint for binary open/closed
const DISTANCE_FRACTION = 0.5
// Tap vs drag disambiguation; passes vertical scroll through
const DRAG_THRESHOLD = 8 // px
// Tighter dampen (short fixed distance, like pull-to-refresh)
const RUBBER_BAND_DAMPEN = 40

function dampen(overshoot: number): number {
  return RUBBER_BAND_DAMPEN * Math.log(1 + overshoot / RUBBER_BAND_DAMPEN)
}

// Pure decision function, testable without pointer simulation.
export function resolveSwipeCommit({
  velocity,
  towardOpen,
  openFraction,
}: SwipeCommitInput): boolean {
  // Fast flick commits in whichever direction (distance-OR-velocity).
  if (velocity > VELOCITY_THRESHOLD) return towardOpen
  // Slow drag: crossing midpoint commits open.
  return openFraction > DISTANCE_FRACTION
}

// Drag-to-reveal gesture for boolean open state (content is drag surface).
export function useSwipeReveal(
  open: Ref<boolean>,
  options: UseSwipeRevealOptions,
): UseSwipeRevealReturn {
  const isDragging = shallowRef(false)

  function leadingActive(): boolean {
    return toValue(options.leading) ?? false
  }
  function trailingActive(): boolean {
    return toValue(options.trailing) ?? true
  }
  function leadingWidth(): number {
    return leadingActive() ? Math.max(0, toValue(options.leadingWidth)) : 0
  }
  function trailingWidth(): number {
    return trailingActive() ? Math.max(0, toValue(options.trailingWidth)) : 0
  }
  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }
  /** The edge a bare `reveal()` / an externally-set `open = true` targets. */
  function defaultSide(): SwipeRevealSide {
    return leadingActive() && !trailingActive() ? 'leading' : 'trailing'
  }
  // Settled offset only (initial value, v-model sync, reveal, release). Rounded so the
  // content edge lands on a whole pixel flush with the actions panel — measured widths
  // are fractional (useElementSize), and a subpixel gap shows as a ~1px seam at rest.
  // Live drag never routes through here; it stays fractional via rubberBand().
  function offsetFor(side: SwipeRevealSide | null): number {
    if (side === 'leading') return Math.round(leadingWidth())
    if (side === 'trailing') return -Math.round(trailingWidth())
    return 0
  }

  const openSide = shallowRef<SwipeRevealSide | null>(open.value ? defaultSide() : null)
  const offset = shallowRef(offsetFor(openSide.value))

  function rubberBand(value: number): number {
    const hi = leadingWidth()
    const lo = -trailingWidth()
    if (value > hi) return hi + dampen(value - hi)
    if (value < lo) return lo - dampen(lo - value)
    return value
  }

  // Keep the live offset synced with v-model/reveal/close and panel resize.
  watch([open, () => leadingWidth(), () => trailingWidth()], () => {
    if (isDragging.value) return
    if (open.value) {
      if (!openSide.value) openSide.value = defaultSide()
      offset.value = offsetFor(openSide.value)
    } else {
      openSide.value = null
      offset.value = 0
    }
  })

  function reveal(side?: SwipeRevealSide) {
    const target = side ?? defaultSide()
    if (target === 'leading' ? !leadingActive() : !trailingActive()) return
    openSide.value = target
    open.value = true
    offset.value = offsetFor(target)
    options.onCommit?.(target)
  }
  function close() {
    openSide.value = null
    open.value = false
    offset.value = 0
    options.onCommit?.(null)
  }

  let pointerId: number | null = null
  let committed = false
  let startX = 0
  let startY = 0
  let startOffset = 0
  let startTime = 0
  let liveOffset = 0
  let dragEl: HTMLElement | null = null
  // Suppress spurious click after drag-to-open (browser fires trailing click).
  let suppressNextClick = false

  function onContentPointerdown(event: PointerEvent) {
    if (isDisabled() || event.button !== 0) return
    pointerId = event.pointerId
    committed = false
    startX = event.clientX
    startY = event.clientY
    startOffset = offset.value
    startTime = performance.now()
    liveOffset = startOffset
    dragEl = event.currentTarget as HTMLElement
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (!committed) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical-dominant: list scroll, abandon tracking.
        pointerId = null
        return
      }
      committed = true
      isDragging.value = true
      dragEl?.setPointerCapture(pointerId)
    }
    event.preventDefault()
    liveOffset = rubberBand(startOffset + dx)
    offset.value = liveOffset
  }

  function endDrag(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    const wasCommitted = committed
    pointerId = null
    committed = false
    isDragging.value = false
    // Not a committed drag — a plain tap, or an abandoned vertical scroll.
    if (!wasCommitted) return

    suppressNextClick = true
    const dx = event.clientX - startX
    // Edge this drag worked toward — offset sign at release, or the drag direction if it's at rest.
    const side: SwipeRevealSide =
      liveOffset > 0 || (liveOffset === 0 && dx > 0) ? 'leading' : 'trailing'
    const width = side === 'leading' ? leadingWidth() : trailingWidth()
    const signedOpening = side === 'leading' ? dx : -dx
    const elapsed = Math.max(1, performance.now() - startTime)
    const velocity = Math.abs(signedOpening) / elapsed
    const shouldOpen =
      width <= 0
        ? false
        : resolveSwipeCommit({
            velocity,
            towardOpen: signedOpening > 0,
            openFraction: Math.abs(liveOffset) / width,
          })
    openSide.value = shouldOpen ? side : null
    open.value = shouldOpen
    offset.value = shouldOpen ? offsetFor(side) : 0
    options.onCommit?.(openSide.value)
  }

  useEventListener(ssrWindow, 'pointermove', onPointerMove)
  useEventListener(ssrWindow, 'pointerup', endDrag)
  useEventListener(ssrWindow, 'pointercancel', endDrag)

  function onContentClick(event: MouseEvent) {
    if (suppressNextClick) {
      suppressNextClick = false
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (!open.value) return
    // iOS convention: tap closes revealed actions.
    event.preventDefault()
    event.stopPropagation()
    close()
  }

  return { isDragging, offset, openSide, onContentPointerdown, onContentClick, reveal, close }
}
