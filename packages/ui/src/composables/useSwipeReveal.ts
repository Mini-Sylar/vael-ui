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
  side?: MaybeRefOrGetter<SwipeRevealSide>
  /** Width (px) of the actions panel — the fully-open extreme. A getter since it's measured off a real element that can change size (responsive action labels, …) — SwipeToReveal.vue feeds this from `useElementSize`. */
  actionsWidth: MaybeRefOrGetter<number>
  disabled?: MaybeRefOrGetter<boolean>
  /** Fires once per settled interaction (pointer release, or a programmatic
   * reveal()/close()) — mirrors useResizable's own onCommit. */
  onCommit?: (open: boolean) => void
}

export interface UseSwipeRevealReturn {
  /** True for the entire span of a COMMITTED drag (past DRAG_THRESHOLD) —
   * never set for a plain tap, matching useResizable's isDragging shape. */
  isDragging: Ref<boolean>
  /** Live px offset toward the open side — 0 = closed, `actionsWidth` = fully open, past either end while rubber-banding. Bind directly to `transform: translateX()` on the content element (signed by `side`) — never through a CSS custom property + calc(), same direct-write convention as useResizable's own model. */
  offset: Ref<number>
  onContentPointerdown: (event: PointerEvent) => void
  /** Intercepts a tap on the content while open: closes instead of letting the row's own click fire, and swallows the browser's own trailing click that follows a completed drag (see the comment on `suppressNextClick` below) so a drag-to-open never immediately re-closes itself. */
  onContentClick: (event: MouseEvent) => void
  reveal: () => void
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

  function actionsWidth(): number {
    return Math.max(0, toValue(options.actionsWidth))
  }
  function side(): SwipeRevealSide {
    return toValue(options.side) ?? 'trailing'
  }
  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }

  const offset = shallowRef(open.value ? actionsWidth() : 0)

  function rubberBand(value: number): number {
    const hi = actionsWidth()
    if (value > hi) return hi + dampen(value - hi)
    if (value < 0) return -dampen(-value)
    return value
  }

  // Keep live offset synced with v-model/reveal/close and panel resize.
  watch([open, () => actionsWidth()], () => {
    if (isDragging.value) return
    offset.value = open.value ? actionsWidth() : 0
  })

  function reveal() {
    open.value = true
    options.onCommit?.(true)
  }
  function close() {
    open.value = false
    options.onCommit?.(false)
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
    const signedOpening = side() === 'trailing' ? -dx : dx
    liveOffset = rubberBand(startOffset + signedOpening)
    offset.value = liveOffset
  }

  function endDrag(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    const wasCommitted = committed
    pointerId = null
    committed = false
    isDragging.value = false
    // Not a committed drag — a plain tap, or an abandoned vertical scroll.
    // Nothing to settle; the native click (if any) proceeds untouched.
    if (!wasCommitted) return

    suppressNextClick = true
    const dx = event.clientX - startX
    const signedOpening = side() === 'trailing' ? -dx : dx
    const elapsed = Math.max(1, performance.now() - startTime)
    const velocity = Math.abs(signedOpening) / elapsed
    const width = actionsWidth()
    const shouldOpen =
      width <= 0
        ? false
        : resolveSwipeCommit({
            velocity,
            towardOpen: signedOpening > 0,
            openFraction: liveOffset / width,
          })
    offset.value = shouldOpen ? width : 0
    open.value = shouldOpen
    options.onCommit?.(shouldOpen)
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

  return { isDragging, offset, onContentPointerdown, onContentClick, reveal, close }
}
