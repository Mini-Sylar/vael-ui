import { onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface SheetSnapPoint {
  id: string
  /** Fraction of dvh, e.g. `0.6` for 60% of the viewport height. */
  height: number
}

export interface UseSheetDragOptions {
  /** The element that's translated (drag, snap-settle, entrance/exit) — never resized. */
  panelEl: Ref<HTMLElement | null>
  /** Pointer-down here always starts a drag. */
  handleEl: Ref<HTMLElement | null>
  /** Pointer-down here only starts a drag once its own scroll is at the top and the drag moves downward — otherwise it's an ordinary scroll. */
  contentEl?: Ref<HTMLElement | null>
  /** Ordered smallest to largest. */
  snapPoints: MaybeRefOrGetter<SheetSnapPoint[]>
  initialSnap?: MaybeRefOrGetter<string | undefined>
  /** Whether a drag past the smallest snap point can dismiss at all. Default true. */
  dismissible?: MaybeRefOrGetter<boolean>
  /** Fires the instant a release decides to dismiss — the panel is still at whatever transform the drag left it at. The caller is expected to request its own close flow here (e.g. Dialog's `close()`), whose `beforeClose` then continues the SAME visual off-screen from there. Keeping that in one place (not also animated here) avoids two competing transform animations racing on the same element. */
  onDismiss: () => void
}

export interface UseSheetDragReturn {
  activeSnap: Ref<string | null>
  isDragging: Ref<boolean>
  /** Re-applies the initial snap position — call after the panel becomes visible again. */
  reset: () => void
  /** Vaul's nested-drawer recede: scales the panel down slightly and shifts it up while a child sheet is stacked on top, COMPOSED with the current snap offset — overwriting the transform outright would throw the panel to the viewport top. */
  setReceded: (receded: boolean) => void
}

// Vaul physics: translateY on fixed height, not per-frame resize.
const TRANSITION =
  'transform var(--ui-duration-drawer, 500ms) var(--ui-ease-drawer, cubic-bezier(0.32, 0.72, 0, 1))'
const FAST_VELOCITY = 2 // px/ms — a real flick, matches Vaul's jump-to-extreme threshold
const VELOCITY_THRESHOLD = 0.4 // px/ms — matches Vaul's "was this deliberate" gate
const SHORT_DRAG_FRACTION = 0.4 // of viewport height — Vaul's step-one-snap-point vs settle-to-nearest split
const NESTED_DISPLACEMENT = 16 // px — Vaul's own recede distance for stacked sheets
// Shifted-log curve (Vaul); viewport-scale range.
const RUBBER_BAND_DAMPEN = 60

// Shifted-log dampen.
function dampen(overshoot: number): number {
  return RUBBER_BAND_DAMPEN * Math.log(1 + overshoot / RUBBER_BAND_DAMPEN)
}

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useSheetDrag(
  active: Ref<boolean>,
  options: UseSheetDragOptions,
): UseSheetDragReturn {
  const activeSnap = shallowRef<string | null>(null)
  const isDragging = shallowRef(false)

  function points(): SheetSnapPoint[] {
    return toValue(options.snapPoints)
  }

  function offsetFor(point: SheetSnapPoint): number {
    return window.innerHeight - point.height * window.innerHeight
  }

  function offsets(): number[] {
    return points().map(offsetFor)
  }

  function currentPoint(): SheetSnapPoint | undefined {
    return points().find((point) => point.id === activeSnap.value)
  }

  // Panel is always viewport tall; translateY(0) = viewport top.
  function applyFixedHeight() {
    const panel = options.panelEl.value
    if (panel) panel.style.blockSize = `${window.innerHeight}px`
  }

  function moveTo(offset: number, animate: boolean) {
    const panel = options.panelEl.value
    if (!panel) return
    panel.style.transition = animate && !reducedMotion() ? TRANSITION : 'none'
    panel.style.transform = `translateY(${offset}px)`
    panel.style.setProperty(
      '--sheet-visible-height',
      `${Math.max(0, window.innerHeight - offset)}px`,
    )
  }

  function settleTo(point: SheetSnapPoint) {
    activeSnap.value = point.id
    moveTo(offsetFor(point), true)
  }

  // Paint twice before transition so browser has "before" value to animate from.
  async function reset() {
    const list = points()
    if (list.length === 0) return
    const initial = list.find((point) => point.id === toValue(options.initialSnap)) ?? list[0]
    applyFixedHeight()
    const panel = options.panelEl.value
    activeSnap.value = initial.id
    if (!panel || reducedMotion()) {
      moveTo(offsetFor(initial), false)
      return
    }
    const myToken = Symbol('sheet-reset')
    resetToken = myToken
    panel.style.transition = 'none'
    panel.style.transform = 'translateY(100%)'
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    if (resetToken !== myToken) return
    settleTo(initial)
  }
  let resetToken: symbol | null = null

  watch(active, (value) => {
    if (value) reset()
  })

  let dragSource: 'handle' | 'content' | null = null
  let dragStartY = 0
  let dragStartOffset = 0
  let dragStartTime = 0
  let dragStartScrollTop = 0

  function beginDrag(clientY: number) {
    const point = currentPoint()
    if (!point) return
    dragStartY = clientY
    dragStartOffset = offsetFor(point)
    dragStartTime = performance.now()
    isDragging.value = true
    moveTo(dragStartOffset, false)
  }

  function onHandlePointerDown(event: PointerEvent) {
    dragSource = 'handle'
    beginDrag(event.clientY)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function onContentPointerDown(event: PointerEvent) {
    dragSource = 'content'
    dragStartY = event.clientY
    dragStartScrollTop = options.contentEl?.value?.scrollTop ?? 0
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragSource) return
    if (dragSource === 'content') {
      const draggingDown = event.clientY > dragStartY
      const atTop = dragStartScrollTop === 0
      if (!(atTop && draggingDown)) return
      dragSource = 'handle'
      beginDrag(event.clientY)
      return
    }
    const list = offsets()
    if (list.length === 0) return
    const delta = event.clientY - dragStartY // positive = pointer down
    const rawOffset = dragStartOffset + delta
    // Top boundary gets resistance; bottom is unclamped (dismiss gesture).
    // Floor at 0 (panel's physical limit with fixed height).
    const topBoundary = Math.min(...list)
    const nextOffset =
      rawOffset < topBoundary
        ? Math.max(0, topBoundary - dampen(topBoundary - rawOffset))
        : rawOffset
    moveTo(nextOffset, false)
  }

  function onPointerUp(event: PointerEvent) {
    const wasDragging = isDragging.value
    const source = dragSource
    dragSource = null
    isDragging.value = false
    if (!wasDragging || source !== 'handle') return

    const list = points()
    const offsetList = offsets()
    const currentOffset = dragStartOffset + (event.clientY - dragStartY)
    const draggedDistance = dragStartY - event.clientY // positive = dragged up (toward open)
    const hasDraggedUp = draggedDistance > 0
    const elapsed = Math.max(1, performance.now() - dragStartTime)
    const velocity = Math.abs(draggedDistance) / elapsed
    const dismissible = toValue(options.dismissible) ?? true
    const currentIndex = list.findIndex((point) => point.id === activeSnap.value)

    if (velocity > FAST_VELOCITY && !hasDraggedUp) {
      if (dismissible) options.onDismiss()
      else settleTo(list[0])
      return
    }
    if (velocity > FAST_VELOCITY && hasDraggedUp) {
      settleTo(list[list.length - 1])
      return
    }

    if (
      velocity > VELOCITY_THRESHOLD &&
      Math.abs(draggedDistance) < window.innerHeight * SHORT_DRAG_FRACTION
    ) {
      const step = hasDraggedUp ? 1 : -1
      const nextIndex = currentIndex + step
      if (step > 0 && currentIndex === list.length - 1) {
        settleTo(list[list.length - 1])
        return
      }
      if (step < 0 && currentIndex === 0) {
        if (dismissible) options.onDismiss()
        else settleTo(list[0])
        return
      }
      settleTo(list[nextIndex])
      return
    }

    // Check if dragging down past all snap points — dismiss if dismissible
    const minOffset = Math.min(...offsetList)
    if (!hasDraggedUp && dismissible && currentOffset > minOffset) {
      options.onDismiss()
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
    settleTo(list[closestIndex])
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
    panel.style.transform = receded
      ? `translateY(${offset - NESTED_DISPLACEMENT}px) scale(${(window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth})`
      : `translateY(${offset}px)`
  }

  useEventListener(options.handleEl, 'pointerdown', onHandlePointerDown)
  useEventListener(options.contentEl, 'pointerdown', onContentPointerDown)
  useEventListener(options.panelEl, 'pointermove', onPointerMove)
  useEventListener(options.panelEl, 'pointerup', onPointerUp)
  useEventListener(options.panelEl, 'pointercancel', onPointerCancel)
  useEventListener(
    () => (typeof window === 'undefined' ? undefined : window),
    'resize',
    () => {
      if (active.value) applyFixedHeight()
    },
  )

  onScopeDispose(() => {
    resetToken = null
  })

  return { activeSnap, isDragging, reset, setReceded }
}
