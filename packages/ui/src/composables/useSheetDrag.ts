import { shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import type { ElRef } from './dom'
import { prefersReducedMotion } from './dom'
import { flingTiming } from '../motion/fling'

export interface SheetSnapPoint {
  id: string
  /** Fraction of dvh, e.g. `0.6` for 60% of the viewport height. */
  height: number
}

export interface UseSheetDragOptions {
  /** The element that's translated (drag, snap-settle, entrance/exit) — never resized. */
  panelEl: ElRef<HTMLElement | null>
  /** Pointer-down here always starts a drag. */
  handleEl: ElRef<HTMLElement | null>
  /** Pointer-down here only starts a drag once its own scroll is at the top, the drag is vertically dominant, and it moves downward — otherwise it's an ordinary scroll (or a horizontal gesture that belongs to something nested, like a swipe-to-reveal row). */
  contentEl?: ElRef<HTMLElement | null>
  /** Element the sheet fills instead of the viewport. */
  bounds?: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** Ordered smallest to largest. */
  snapPoints: MaybeRefOrGetter<SheetSnapPoint[]>
  initialSnap?: MaybeRefOrGetter<string | undefined>
  /** Whether a drag past the smallest snap point can dismiss at all. Default true. */
  dismissible?: MaybeRefOrGetter<boolean>
  /**
   * Fires when a release decides to dismiss, with the panel where the drag left it. Request your
   * close flow here. `velocity` is the release speed in px/ms, positive toward closed.
   */
  onDismiss: (velocity: number) => void
  /**
   * While dragging: how open the sheet is, `1` at the lowest snap point or above, `0` closed. Once
   * it's let go without closing, `null` with the timing it settles on; unset means the drawer's.
   */
  onProgress?: (progress: number | null, timing?: { duration: number; easing: string }) => void
}

export interface UseSheetDragReturn {
  /** The snap point the sheet rests on. Set it to move the sheet there. */
  activeSnap: Ref<string | null>
  isDragging: Ref<boolean>
  /** Re-applies the initial snap position — call after the panel becomes visible again. */
  reset: () => void
  /** Vaul's nested-drawer recede: scales the panel down slightly and shifts it up while a child sheet is stacked on top, COMPOSED with the current snap offset — overwriting the transform outright would throw the panel to the viewport top. */
  setReceded: (receded: boolean) => void
  /** Back to where it rests: a refused dismiss springs back from where it was let go. */
  settle: () => void
}

// Vaul physics: translateY on fixed height, not per-frame resize.
const TRANSITION =
  'transform var(--ui-duration-drawer, 500ms) var(--ui-ease-drawer, cubic-bezier(0.32, 0.72, 0, 1))'
const FAST_VELOCITY = 2 // px/ms — a real flick, matches Vaul's jump-to-extreme threshold
const VELOCITY_THRESHOLD = 0.4 // px/ms — matches Vaul's "was this deliberate" gate
const SHORT_DRAG_FRACTION = 0.4 // of viewport height — Vaul's step-one-snap-point vs settle-to-nearest split
// Of the lowest snap point's height: a slow drag must go this far below it to close (Vaul's value).
const CLOSE_THRESHOLD = 0.25
const NESTED_DISPLACEMENT = 16 // px — Vaul's own recede distance for stacked sheets
const AXIS_LOCK_THRESHOLD = 8 // px — movement before a content drag commits to an axis; matches useSwipeReveal
// Only the end of a drag counts, so a slow drag that ends in a flick reads as a flick.
const VELOCITY_WINDOW = 80 // ms
// Shifted-log curve (Vaul); viewport-scale range.
const RUBBER_BAND_DAMPEN = 60

// Shifted-log dampen.
function dampen(overshoot: number): number {
  return RUBBER_BAND_DAMPEN * Math.log(1 + overshoot / RUBBER_BAND_DAMPEN)
}

function reducedMotion(): boolean {
  return prefersReducedMotion()
}

// visualViewport tracks a mobile browser's dynamic toolbar show/hide live; window.innerHeight is a one-time read that only updates on an actual 'resize' event, which mobile browsers don't reliably fire for toolbar changes.
function viewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight
}
function viewportWidth(): number {
  return window.visualViewport?.width ?? window.innerWidth
}

export function useSheetDrag(
  active: Ref<boolean>,
  options: UseSheetDragOptions,
): UseSheetDragReturn {
  const activeSnap = shallowRef<string | null>(null)
  const isDragging = shallowRef(false)
  let lastAppliedOffset = 0

  // The area the sheet fills: its container when contained, else the viewport.
  function areaHeight(): number {
    return toValue(options.bounds)?.clientHeight ?? viewportHeight()
  }
  function areaWidth(): number {
    return toValue(options.bounds)?.clientWidth ?? viewportWidth()
  }

  function points(): SheetSnapPoint[] {
    return toValue(options.snapPoints)
  }

  function offsetFor(point: SheetSnapPoint): number {
    const height = areaHeight()
    return height - point.height * height
  }

  function offsets(): number[] {
    return points().map(offsetFor)
  }

  function currentPoint(): SheetSnapPoint | undefined {
    return points().find((point) => point.id === activeSnap.value)
  }

  // Panel is always as tall as its area; translateY(0) = the area's top.
  function applyFixedHeight() {
    const panel = options.panelEl.value
    if (panel) panel.style.blockSize = `${areaHeight()}px`
  }

  // The scrolling body is capped at the height that shows (--sheet-visible-height), so a sheet
  // resting at a low snap point still scrolls to its last row. Changing the cap lays out the whole
  // sheet again, so a drag never touches it: it is raised once when the drag starts, to the highest
  // snap point, and lowered only after a settle, when the part it cuts is below the screen.
  let stopPendingCap: (() => void) | null = null

  function currentCap(panel: HTMLElement): number {
    const value = Number.parseFloat(panel.style.getPropertyValue('--sheet-visible-height'))
    return Number.isNaN(value) ? -1 : value
  }

  function setVisibleCap(visible: number) {
    stopPendingCap?.()
    stopPendingCap = null
    const panel = options.panelEl.value
    if (!panel || currentCap(panel) === visible) return
    panel.style.setProperty('--sheet-visible-height', `${visible}px`)
  }

  function setVisibleCapAfterSettle(panel: HTMLElement, visible: number) {
    stopPendingCap?.()
    const onEnd = (event: TransitionEvent) => {
      if (event.target === panel && event.propertyName === 'transform') setVisibleCap(visible)
    }
    // In case the transition never ends (interrupted, or the panel was hidden).
    const duration = getComputedStyle(panel).transitionDuration
    const ms = Number.parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000)
    const timer = setTimeout(() => setVisibleCap(visible), (Number.isNaN(ms) ? 500 : ms) + 50)
    panel.addEventListener('transitionend', onEnd)
    stopPendingCap = () => {
      panel.removeEventListener('transitionend', onEnd)
      clearTimeout(timer)
    }
  }

  // A drag reported progress: the settle after it says so.
  let scrubbing = false
  function progressAt(offset: number): number {
    const showing = areaHeight() - Math.max(...offsets())
    return showing > 0 ? Math.min(1, Math.max(0, (areaHeight() - offset) / showing)) : 1
  }
  // Closing carries on from where the drag left it.
  function dismiss(velocity: number) {
    scrubbing = false
    options.onDismiss(velocity)
  }

  /** `timing`: a release's own spring, starting at the finger's speed (`flingTiming`). */
  function moveTo(
    offset: number,
    animate: boolean,
    dragging = false,
    timing?: { duration: number; easing: string },
  ) {
    const panel = options.panelEl.value
    if (!panel) return
    const animated = animate && !reducedMotion()
    panel.style.transition = !animated
      ? 'none'
      : timing
        ? `transform ${timing.duration}ms ${timing.easing}`
        : TRANSITION
    panel.style.transform = `translateY(${offset}px)`
    lastAppliedOffset = offset
    if (dragging) {
      scrubbing = !!options.onProgress
      options.onProgress?.(progressAt(offset))
      return
    }
    if (scrubbing) {
      scrubbing = false
      options.onProgress?.(null, animated ? timing : { duration: 0, easing: 'linear' })
    }
    const visible = Math.max(0, areaHeight() - offset)
    // More showing: raise the cap now so nothing comes in blank. Less: wait for the panel to stop.
    if (!animated || visible >= currentCap(panel)) setVisibleCap(visible)
    else setVisibleCapAfterSettle(panel, visible)
  }

  // Writing `activeSnap` from outside settles the sheet there; the sheet's own writes don't.
  let ownWrite = false
  function setSnap(id: string) {
    ownWrite = true
    activeSnap.value = id
    ownWrite = false
  }
  watch(
    activeSnap,
    (id) => {
      if (ownWrite || isDragging.value) return
      const point = points().find((candidate) => candidate.id === id)
      if (point) moveTo(offsetFor(point), !reducedMotion())
    },
    { flush: 'sync' },
  )

  /** `velocity` (px/ms, positive down): the release speed it carries on from. */
  function settleTo(point: SheetSnapPoint, velocity = 0) {
    setSnap(point.id)
    const offset = offsetFor(point)
    const timing = velocity ? flingTiming(offset - lastAppliedOffset, velocity) : undefined
    moveTo(offset, true, false, timing)
  }

  // Opening: rest at the first snap point at once. The rise from below is the motion engine's
  // (on `translate`), so the drag's `transform` never animates in or out.
  function reset() {
    const list = points()
    if (list.length === 0) return
    const initial = list.find((point) => point.id === toValue(options.initialSnap)) ?? list[0]
    applyFixedHeight()
    setSnap(initial.id)
    moveTo(offsetFor(initial), false)
  }
  // Closing leaves the panel where it is: the engine slides it out from there.
  watch(active, (value) => value && reset())

  let dragSource: 'handle' | 'content' | null = null
  let dragStartX = 0
  let dragStartY = 0
  let dragStartOffset = 0
  let dragStartTime = 0
  let dragStartScrollTop = 0
  let samples: { t: number; y: number }[] = []

  // Keep one sample older than the window, so a release right after a pause still has two points.
  function addSample(clientY: number) {
    const now = performance.now()
    samples.push({ t: now, y: clientY })
    const firstInWindow = samples.findIndex((sample) => now - sample.t <= VELOCITY_WINDOW)
    if (firstInWindow > 1) samples = samples.slice(firstInWindow - 1)
  }

  function releaseVelocity(): number {
    const last = samples.at(-1)
    if (!last) return 0
    const anchor =
      samples.find((sample) => last.t - sample.t <= VELOCITY_WINDOW && sample !== last) ??
      samples.at(-2)
    if (!anchor || last.t === anchor.t) return 0
    return (last.y - anchor.y) / (last.t - anchor.t)
  }

  function beginDrag(clientY: number) {
    const point = currentPoint()
    if (!point) return
    dragStartY = clientY
    dragStartOffset = lastAppliedOffset
    dragStartTime = performance.now()
    samples = [{ t: dragStartTime, y: clientY }]
    isDragging.value = true
    moveTo(dragStartOffset, false, true)
    // Room for the highest snap point up front, so no drag frame resizes the body.
    const panel = options.panelEl.value
    if (panel) {
      const top = Math.max(0, areaHeight() - Math.min(...offsets()))
      setVisibleCap(Math.max(top, currentCap(panel)))
    }
  }

  function onHandlePointerDown(event: PointerEvent) {
    dragSource = 'handle'
    beginDrag(event.clientY)
    try {
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    } catch {
      // Capture can fail for synthetic/non-standard pointer ids; not fatal.
    }
    event.preventDefault()
  }

  function onContentPointerDown(event: PointerEvent) {
    dragSource = 'content'
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragStartScrollTop = options.contentEl?.value?.scrollTop ?? 0
  }

  // Touch: the content is a native scroller, so a drag that belongs to the sheet would also scroll
  // or bounce the content under the finger, and the browser would cancel the pointer once it took
  // the gesture. Who owns it is settled on the first move, the last point a scroll can be cancelled:
  // down from the top is the sheet's, for the whole touch; anything else is the content's.
  let touchStartX = 0
  let touchStartY = 0
  let touchOwner: 'sheet' | 'content' | null = null
  let nestedClaimed = false

  function onContentTouchStart(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch || event.touches.length > 1) return
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchOwner = null
    nestedClaimed = false
  }

  function onContentTouchMove(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch || event.touches.length > 1) return
    if (touchOwner === null) {
      const dx = touch.clientX - touchStartX
      const dy = touch.clientY - touchStartY
      if (dx === 0 && dy === 0) return
      const atTop = (options.contentEl?.value?.scrollTop ?? 0) <= 0
      touchOwner = atTop && dy > 0 && Math.abs(dy) > Math.abs(dx) ? 'sheet' : 'content'
    }
    // A nested horizontal gesture claimed it after all (see onPointerMove): hand it back.
    if (touchOwner === 'sheet' && nestedClaimed) touchOwner = 'content'
    if (touchOwner === 'sheet' && event.cancelable) event.preventDefault()
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragSource) return
    if (dragSource === 'content') {
      const dx = event.clientX - dragStartX
      const dy = event.clientY - dragStartY
      if (Math.abs(dx) < AXIS_LOCK_THRESHOLD && Math.abs(dy) < AXIS_LOCK_THRESHOLD) return
      // Horizontally-dominant → belongs to something nested (a swipe-to-reveal row), not a dismiss.
      if (Math.abs(dx) >= Math.abs(dy)) {
        dragSource = null
        nestedClaimed = true
        return
      }
      const draggingDown = dy > 0
      const atTop = dragStartScrollTop === 0
      if (!(atTop && draggingDown)) return
      dragSource = 'handle'
      beginDrag(event.clientY)
      return
    }
    const list = offsets()
    if (list.length === 0) return
    addSample(event.clientY)
    const delta = event.clientY - dragStartY // positive = pointer down
    const rawOffset = dragStartOffset + delta
    // Top boundary gets resistance; bottom is unclamped (dismiss gesture).
    // Floor at 0 (panel's physical limit with fixed height).
    const topBoundary = Math.min(...list)
    const nextOffset =
      rawOffset < topBoundary
        ? Math.max(0, topBoundary - dampen(topBoundary - rawOffset))
        : rawOffset
    moveTo(nextOffset, false, true)
  }

  function onPointerUp(event: PointerEvent) {
    const wasDragging = isDragging.value
    const source = dragSource
    dragSource = null
    isDragging.value = false
    if (!wasDragging || source !== 'handle') return
    addSample(event.clientY)

    const list = points()
    const offsetList = offsets()
    const currentOffset = dragStartOffset + (event.clientY - dragStartY)
    const draggedDistance = dragStartY - event.clientY // positive = dragged up (toward open)
    const hasDraggedUp = draggedDistance > 0
    const elapsed = Math.max(1, performance.now() - dragStartTime)
    const velocity = Math.abs(draggedDistance) / elapsed
    const dismissible = toValue(options.dismissible) ?? true
    const currentIndex = list.findIndex((point) => point.id === activeSnap.value)

    // Speed and direction come from the end of the gesture, so a slow drag that ends in a flick
    // reads as a flick; the whole-drag average covers a release with no recent movement.
    const endVelocity = releaseVelocity() // px/ms, positive = down
    const speed = Math.max(velocity, Math.abs(endVelocity))
    const movingDown = endVelocity !== 0 ? endVelocity > 0 : !hasDraggedUp
    const last = list.length - 1
    // Closing takes a sheet let go below where it rests at its lowest. A raised sheet pulled back
    // down, however fast, only goes back to rest.
    const maxOffset = Math.max(...offsetList)
    const closeOrRest = () => {
      if (dismissible && currentOffset > maxOffset) dismiss(releaseVelocity())
      else settleTo(list[0], endVelocity)
    }

    if (speed > FAST_VELOCITY) {
      if (movingDown) closeOrRest()
      else settleTo(list[last], endVelocity)
      return
    }

    if (
      speed > VELOCITY_THRESHOLD &&
      Math.abs(draggedDistance) < areaHeight() * SHORT_DRAG_FRACTION
    ) {
      if (!movingDown) settleTo(list[Math.min(currentIndex + 1, last)], endVelocity)
      else if (currentIndex <= 0) closeOrRest()
      else settleTo(list[currentIndex - 1], endVelocity)
      return
    }

    // A slow release closes only well below the lowest snap point. Comparing with the highest one
    // closed the sheet on any slow drag that ended a little lower than it started.
    const lowestShowing = areaHeight() - maxOffset
    if (movingDown && dismissible && currentOffset > maxOffset + lowestShowing * CLOSE_THRESHOLD) {
      dismiss(releaseVelocity())
      return
    }

    let closestIndex = 0
    let closestDistance = Infinity
    for (const [i, offset] of offsetList.entries()) {
      const distance = Math.abs(offset - currentOffset)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = i
      }
    }
    settleTo(list[closestIndex], endVelocity)
  }

  function onPointerCancel() {
    const wasDragging = isDragging.value
    dragSource = null
    isDragging.value = false
    if (!wasDragging) return
    const point = currentPoint()
    if (point) settleTo(point)
  }

  function setReceded(receded: boolean) {
    const panel = options.panelEl.value
    const point = currentPoint()
    if (!panel || !point) return
    const offset = offsetFor(point)
    // Origin at top edge (not center) to avoid swallowing the shift.
    panel.style.transformOrigin = '50% 0'
    panel.style.transition = reducedMotion() ? 'none' : TRANSITION
    const width = areaWidth()
    panel.style.transform = receded
      ? `translateY(${offset - NESTED_DISPLACEMENT}px) scale(${(width - NESTED_DISPLACEMENT) / width})`
      : `translateY(${offset}px)`
  }

  useEventListener(options.handleEl, 'pointerdown', onHandlePointerDown)
  useEventListener(options.contentEl, 'pointerdown', onContentPointerDown)
  useEventListener(options.contentEl, 'touchstart', onContentTouchStart, { passive: true })
  // Not passive: it has to be able to cancel the browser's own scroll.
  useEventListener(options.contentEl, 'touchmove', onContentTouchMove, { passive: false })
  useEventListener(options.panelEl, 'pointermove', onPointerMove)
  useEventListener(options.panelEl, 'pointerup', onPointerUp)
  useEventListener(options.panelEl, 'pointercancel', onPointerCancel)
  // The area changed size: a phone's toolbars hid or showed (Samsung Internet and Chrome collapse
  // them on scroll), the keyboard opened, or the container resized. Refit the panel and glide back
  // to the same snap point, so the sheet doesn't drift off it or leave a toolbar-tall strip with
  // no content at the bottom. Mid-drag the finger owns the position; the release settles it.
  function onAreaResize() {
    if (!active.value) return
    applyFixedHeight()
    if (isDragging.value) return
    const point = currentPoint()
    if (point) moveTo(offsetFor(point), true)
  }
  useEventListener(
    () => (typeof window === 'undefined' ? undefined : (window.visualViewport ?? window)),
    'resize',
    onAreaResize,
  )
  useResizeObserver(() => toValue(options.bounds) ?? undefined, onAreaResize)

  /** Back to where it rests (a refused dismiss springs back from where it was let go). */
  function settle() {
    const point = currentPoint()
    if (point) settleTo(point)
  }

  return { activeSnap, isDragging, reset, setReceded, settle }
}
