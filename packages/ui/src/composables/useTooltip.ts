import { onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { onLongPress, useEventListener } from '@vueuse/core'
import type { Side } from '@floating-ui/dom'
import { useFloatingPosition } from './useFloatingPosition'
import type { Align } from './useFloatingPosition'
import type { ElRef } from './dom'
import { ssrWindow } from '../ssr'
import { prefersReducedMotion } from './dom'

export type TooltipCloseReason = 'pointer' | 'focus' | 'trigger' | 'escape' | 'programmatic'

/** Sent only when a close is requested (`value` is `false`); `cancel()` keeps the tooltip open. */
export interface TooltipOpenChangeDetails {
  reason: TooltipCloseReason
  event?: Event
  cancel: () => void
}

// Warm group: next tooltip opens instantly, glides from previous rect.
const SKIP_DELAY_WINDOW = 300
interface TravelRect {
  top: number
  left: number
  width: number
  height: number
}

const warmth = {
  visible: 0,
  lastHideAt: Number.NEGATIVE_INFINITY,
  lastRect: null as TravelRect | null,
}

interface WarmPeer {
  rect: () => TravelRect | null
  vanish: () => void
}
const visiblePeers = new Set<WarmPeer>()

function isWarm(): boolean {
  return warmth.visible > 0 || performance.now() - warmth.lastHideAt < SKIP_DELAY_WINDOW
}

/** Test-only: clears the shared warm-group window between test cases. */
export function __resetTooltipWarmth() {
  warmth.visible = 0
  warmth.lastHideAt = Number.NEGATIVE_INFINITY
  warmth.lastRect = null
  visiblePeers.clear()
}

export interface UseTooltipOptions {
  triggerEl: ElRef<HTMLElement | null>
  positionerEl: ElRef<HTMLElement | null>
  side?: MaybeRefOrGetter<Side>
  align?: MaybeRefOrGetter<Align>
  sideOffset?: MaybeRefOrGetter<number>
  alignOffset?: MaybeRefOrGetter<number>
  /** Delay before a cold open, ms. Warm opens are always instant. */
  openDelay?: MaybeRefOrGetter<number>
  /** Grace period after the pointer leaves, ms — long enough to travel onto the tooltip. */
  closeDelay?: MaybeRefOrGetter<number>
  /** Hovering the tooltip itself keeps it open (selectable/clickable content). */
  interactive?: MaybeRefOrGetter<boolean>
  closeOnEsc?: MaybeRefOrGetter<boolean>
  onOpenChange?: (value: boolean, details: TooltipOpenChangeDetails) => void
  /** Getter so the underlying prop stays reactive without being invoked by `toValue`. */
  beforeClose?: () => ((done: () => void) => void) | undefined
}

// Core state machine; TooltipHost drives intents via delegation.
export function useTooltipCore(open: Ref<boolean>, options: UseTooltipOptions) {
  const {
    positionerStyle: floatingStyle,
    placement,
    transformOrigin,
  } = useFloatingPosition({
    referenceEl: options.triggerEl,
    floatingEl: options.positionerEl,
    active: open,
    side: () => toValue(options.side) ?? 'top',
    align: options.align,
    sideOffset: options.sideOffset,
    alignOffset: options.alignOffset,
    // A route change can remove the trigger while a delegated TooltipHost stays mounted - closing
    // outright beats leaving it repositioned against a detached node (which degenerates to (0,0)).
    onReferenceDisconnected: () => {
      open.value = false
    },
  })

  const isClosing = shallowRef(false)
  const instant = shallowRef(false)
  // Only three things ever animate, all on the compositor: the positioner's translate (while
  // `traveling`), and the box layer's scale with the content's opacity (while `morphing`). Layout
  // is written once per open. Two flags, so staging one never cuts the other's transition short.
  const traveling = shallowRef(false)
  const morphing = shallowRef(false)
  // True for a travel's whole span, from the frame its from-state is staged until it has settled.
  const travelActive = shallowRef(false)
  const positionerStyle = shallowRef<Record<string, string>>(floatingStyle.value)
  // Custom properties the box layer and the content read: the box's scale while it morphs between
  // two sizes, and the content's opacity while a new label fades in.
  const panelStyle = shallowRef<Record<string, string>>({})
  let travelFrom: TravelRect | null = null
  let travelToken = 0

  interface Point {
    left: number
    top: number
  }
  // Where the positioner is laid out while visible. It stays put for the whole open: any later
  // movement is a `translate` on top of it, which the compositor can move without the text being
  // laid out and rasterised again every frame (the source of jitter on low-DPR screens).
  let base: Point | null = null
  // Where the tooltip should be, in the same coordinates.
  let target: Point = { left: 0, top: 0 }

  function pointOf(style: Record<string, string>): Point {
    return { left: Number.parseFloat(style.left), top: Number.parseFloat(style.top) }
  }
  function translateFor(from: Point, to: Point): string {
    const dx = to.left - from.left
    const dy = to.top - from.top
    return dx === 0 && dy === 0 ? '' : `${dx}px ${dy}px`
  }
  function setPositioner(translate: string) {
    if (!base) return
    positionerStyle.value = {
      position: 'absolute',
      top: `${base.top}px`,
      left: `${base.left}px`,
      translate,
      visibility: 'visible',
    }
  }
  /** Moves the box to `point` as a translate off `base`: instant when nothing is transitioning. */
  function commit(point: Point) {
    target = point
    if (base) setPositioner(translateFor(base, point))
  }
  /** Lays the positioner out at `point`, with no translate: a fresh open, or a settled travel. */
  function park(point: Point) {
    base = point
    target = point
    setPositioner('')
    captureSize()
  }
  function setMorph(x: number, y: number, contentOpacity: number) {
    panelStyle.value = {
      '--ui-tooltip-morph-x': String(x),
      '--ui-tooltip-morph-y': String(y),
      '--ui-tooltip-content-opacity': String(contentOpacity),
    }
  }

  function measureRect(): TravelRect | null {
    const el = options.positionerEl.value
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    }
  }

  function beginTravel() {
    if (positionerStyle.value.visibility !== 'visible') return
    travelFrom = measureRect()
  }

  function reducedMotion(): boolean {
    return prefersReducedMotion()
  }

  // Further apart than this is not one sweep across a row of triggers: the tooltip just appears.
  const TRAVEL_MAX_DISTANCE = 320
  const REPOSITION_MIN_DISTANCE = 4
  // Matches the CSS transition duration (--ui-duration-tooltip, 125ms) plus a small buffer for it
  // to finish painting — not an independent value to keep in sync by hand.
  const TRAVEL_SETTLE_MS = 150

  function distanceBetween(a: Point, b: Point): number {
    return Math.hypot(a.left - b.left, a.top - b.top)
  }

  let travelRaf1: number | undefined
  let travelRaf2: number | undefined
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  let settleDone: (() => void) | undefined

  function clearTravelSchedule() {
    if (travelRaf1 !== undefined) cancelAnimationFrame(travelRaf1)
    if (travelRaf2 !== undefined) cancelAnimationFrame(travelRaf2)
    clearTimeout(settleTimer)
    travelRaf1 = travelRaf2 = settleTimer = settleDone = undefined
    travelActive.value = false
  }

  // Ends a transition once it has had its full duration, counted from the last retarget.
  function armSettle(token: number, done: () => void) {
    settleDone = done
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      settleTimer = settleDone = undefined
      if (token !== travelToken || positionerStyle.value.visibility !== 'visible') {
        travelActive.value = false
        return
      }
      done()
    }, TRAVEL_SETTLE_MS)
  }

  // Settles: the positioner is laid out where the box already is, and the translate goes, so
  // nothing on screen changes.
  function settle() {
    travelActive.value = false
    traveling.value = false
    morphing.value = false
    park(target)
  }

  // The target is still on the move while the box transitions toward it (a dock item spreading
  // under the pointer): retarget the running transition, which carries on from wherever the box
  // is now, and give it the full settle again.
  function follow(point: Point) {
    if (distanceBetween(target, point) < 0.25) return
    commit(point)
    if (settleDone) armSettle(travelToken, settleDone)
  }

  // The anchor the box layer scales around, as fractions of its size, from the same origin the
  // open animation uses, so a morph stretches away from the trigger's side.
  function originFractions(): { x: number; y: number } {
    const tokens = transformOrigin.value.split(' ')
    let x = 0.5
    let y = 0.5
    for (const token of tokens) {
      if (token === 'left') x = 0
      else if (token === 'right') x = 1
      else if (token === 'top') y = 0
      else if (token === 'bottom') y = 1
    }
    return { x, y }
  }

  /** The box glides from `from` (where the previous tooltip was) into `point`, morphing between
   * the two sizes on the way. Nothing is laid out twice: the positioner is laid out at `point`,
   * the box layer starts scaled to the old size and translated onto the old spot, and both ease
   * to rest while the new label fades in. */
  function stageTravel(from: TravelRect, point: Point) {
    const el = options.positionerEl.value
    const rect = el?.getBoundingClientRect()
    const targetWidth = rect?.width || from.width
    const targetHeight = rect?.height || from.height
    if (reducedMotion() || distanceBetween(from, point) > TRAVEL_MAX_DISTANCE) {
      clearTravelSchedule()
      traveling.value = false
      morphing.value = false
      park(point)
      setMorph(1, 1, 1)
      return
    }
    clearTravelSchedule()
    const token = ++travelToken
    travelActive.value = true
    traveling.value = false
    morphing.value = false
    base = point
    target = point
    const origin = originFractions()
    const sx = from.width / targetWidth
    const sy = from.height / targetHeight
    // The box's anchor point sits where the old box's anchor was.
    const staged: Point = {
      left: from.left + origin.x * from.width - origin.x * targetWidth,
      top: from.top + origin.y * from.height - origin.y * targetHeight,
    }
    setPositioner(translateFor(point, staged))
    setMorph(sx, sy, 0)
    travelRaf1 = requestAnimationFrame(() => {
      travelRaf2 = requestAnimationFrame(() => {
        travelRaf1 = travelRaf2 = undefined
        if (token !== travelToken || positionerStyle.value.visibility !== 'visible') {
          travelActive.value = false
          return
        }
        traveling.value = true
        morphing.value = true
        // The freshest position, not the one the travel was staged with: the target may have
        // moved during the two frames the from-state was held.
        commit(pointOf(floatingStyle.value))
        setMorph(1, 1, 1)
        armSettle(token, settle)
      })
    })
  }

  // Content that changes size while the tooltip is open (a label swap on the same target, rich
  // content loading): the box morphs from the old size instead of jumping, through the same
  // layer the travel uses.
  let sizePrev: { width: number; height: number } | null = null
  let sizeObserver: ResizeObserver | undefined
  function captureSize() {
    const el = options.positionerEl.value
    sizePrev = el ? { width: el.offsetWidth, height: el.offsetHeight } : null
  }
  function onPositionerResize() {
    const el = options.positionerEl.value
    if (!el) return
    const width = el.offsetWidth
    const height = el.offsetHeight
    // Hidden, or mid-travel (the content already swapped, the box is morphing to it): just keep
    // the size as the baseline the next change is measured from.
    if (positionerStyle.value.visibility !== 'visible' || travelActive.value) {
      sizePrev = { width, height }
      return
    }
    const prev = sizePrev
    sizePrev = { width, height }
    if (!prev || !width || !height) return
    if (prev.width === width && prev.height === height) return
    if (reducedMotion()) return
    clearTravelSchedule()
    const token = ++travelToken
    travelActive.value = true
    // Only the morph is staged; a glide already under way keeps its transition.
    morphing.value = false
    setMorph(prev.width / width, prev.height / height, 1)
    travelRaf1 = requestAnimationFrame(() => {
      travelRaf2 = requestAnimationFrame(() => {
        travelRaf1 = travelRaf2 = undefined
        if (token !== travelToken || positionerStyle.value.visibility !== 'visible') {
          travelActive.value = false
          return
        }
        traveling.value = true
        morphing.value = true
        commit(pointOf(floatingStyle.value))
        setMorph(1, 1, 1)
        armSettle(token, settle)
      })
    })
  }
  watch(
    options.positionerEl,
    (el, _previous, onCleanup) => {
      sizeObserver?.disconnect()
      sizePrev = null
      if (!el || typeof ResizeObserver === 'undefined') return
      sizeObserver = new ResizeObserver(onPositionerResize)
      sizeObserver.observe(el)
      onCleanup(() => sizeObserver?.disconnect())
    },
    { immediate: true },
  )

  watch(floatingStyle, (next) => {
    const wasVisible = positionerStyle.value.visibility === 'visible'
    const isVisible = next.visibility === 'visible'
    if (!isVisible) {
      clearTravelSchedule()
      traveling.value = false
      morphing.value = false
      base = null
      sizePrev = null
      positionerStyle.value = next
      setMorph(1, 1, 1)
      return
    }
    const point = pointOf(next)
    if (travelFrom) {
      const from = travelFrom
      travelFrom = null
      stageTravel(from, point)
      return
    }
    if (!wasVisible || !base) {
      clearTravelSchedule()
      traveling.value = false
      morphing.value = false
      park(point)
      setMorph(1, 1, 1)
      return
    }
    if (traveling.value) {
      follow(point)
      return
    }
    if (travelActive.value) {
      // Staged and waiting for its frame: the staged from-state must hold; the travel then
      // starts toward the freshest position on its own.
      target = point
      return
    }
    if (distanceBetween(target, point) > REPOSITION_MIN_DISTANCE) {
      clearTravelSchedule()
      const token = ++travelToken
      traveling.value = true
      commit(point)
      armSettle(token, () => {
        traveling.value = false
      })
      return
    }
    commit(point)
  })

  let pendingClose: symbol | null = null

  function requestClose(reason: TooltipCloseReason, event?: Event) {
    if (!open.value) return
    if (isClosing.value) return
    let cancelled = false
    const details: TooltipOpenChangeDetails = {
      reason,
      event,
      cancel: () => {
        cancelled = true
      },
    }
    options.onOpenChange?.(false, details)
    if (cancelled) return

    // Save glide origin for next warm open.
    if (typeof window !== 'undefined') {
      warmth.lastRect = measureRect() ?? warmth.lastRect
    }

    const beforeClose = options.beforeClose?.()
    if (!beforeClose) {
      open.value = false
      return
    }
    const token = Symbol('pending-close')
    pendingClose = token
    isClosing.value = true
    beforeClose(() => {
      if (pendingClose !== token) return
      pendingClose = null
      isClosing.value = false
      open.value = false
    })
  }

  function cancelClose() {
    pendingClose = null
    isClosing.value = false
  }

  function show() {
    clearTimers()
    if (isClosing.value) {
      cancelClose()
      return
    }
    instant.value = false
    open.value = true
  }

  function hide() {
    clearTimers()
    requestClose('programmatic')
  }

  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined

  function clearTimers() {
    clearTimeout(openTimer)
    clearTimeout(closeTimer)
    openTimer = closeTimer = undefined
  }

  if (typeof window === 'undefined') {
    return {
      positionerStyle,
      panelStyle,
      placement,
      transformOrigin,
      isClosing,
      instant,
      traveling,
      morphing,
      travelActive,
      show,
      hide,
      requestClose,
      cancelClose,
      beginTravel: () => {},
      pointerEnter: () => {},
      pointerLeave: () => {},
      focusEnter: () => {},
      focusLeave: () => {},
      press: () => {},
    }
  }

  // Click dismisses and suppresses reopen until pointer leaves.
  let suppressed = false
  // Touch has no hover - `focusEnter`'s `:focus-visible` open path is guarded against it below so long-press (the only positive touch trigger) doesn't leak in through focus instead.
  let lastPointerWasTouch = false

  let suppressNextClick = false

  const peer: WarmPeer = {
    rect: measureRect,
    vanish: () => requestClose('pointer'),
  }

  function doOpen(wasWarm: boolean) {
    openTimer = undefined
    instant.value = wasWarm
    if (wasWarm) {
      // The newest peer first: an earlier one may still be fading out where it was, and a sweep
      // across triggers should carry on from the tooltip that is moving now.
      for (const other of [...visiblePeers].reverse()) {
        if (other === peer) continue
        const rect = other.rect()
        if (rect) {
          travelFrom = rect
          other.vanish()
          break
        }
      }
      if (!travelFrom && performance.now() - warmth.lastHideAt < SKIP_DELAY_WINDOW) {
        travelFrom = warmth.lastRect
      }
    }
    open.value = true
  }

  function pointerEnter(event?: PointerEvent) {
    if (event?.pointerType === 'touch') return
    clearTimeout(closeTimer)
    if (isClosing.value) {
      cancelClose()
      return
    }
    if (suppressed || open.value || openTimer) return
    const warm = isWarm()
    const delay = warm ? 0 : (toValue(options.openDelay) ?? 400)
    if (delay <= 0) doOpen(warm)
    else openTimer = setTimeout(() => doOpen(false), delay)
  }

  function pointerLeave() {
    suppressed = false
    clearTimeout(openTimer)
    openTimer = undefined
    scheduleClose()
  }

  function focusEnter() {
    // Touch owns its own trigger (long-press, below) - WebKit can mark a tapped button's resulting focus as `:focus-visible`, which would otherwise open the tooltip on every plain tap.
    if (lastPointerWasTouch) return
    const trigger = options.triggerEl.value
    // Only :focus-visible (mouse clicks would fight click-dismiss).
    if (!trigger?.matches(':focus-visible')) return
    clearTimers()
    if (isClosing.value) {
      cancelClose()
      return
    }
    doOpen(isWarm())
  }

  function focusLeave(event?: Event) {
    clearTimers()
    requestClose('focus', event)
  }

  function press(event?: Event) {
    clearTimers()
    suppressed = true
    requestClose('trigger', event)
  }

  function scheduleClose() {
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => requestClose('pointer'), toValue(options.closeDelay) ?? 100)
  }

  useEventListener(options.triggerEl, 'pointerdown', (event: PointerEvent) => {
    lastPointerWasTouch = event.pointerType === 'touch'
    // A new press is a new gesture. Android fires no click after a long press, so a flag left
    // from one would swallow the next real tap and the trigger would need two.
    suppressNextClick = false
  })
  // VueUse's own long-press primitive (500ms delay, 10px move tolerance to cancel, both matching
  // platform convention) - it fires for every pointer type, so the handler itself gates on touch.
  onLongPress(
    options.triggerEl,
    (event) => {
      if (event.pointerType === 'touch') show()
    },
    {
      onMouseUp: (_duration, _distance, isLongPress) => {
        if (isLongPress && lastPointerWasTouch) suppressNextClick = true
      },
    },
  )
  // A long-press that fires mid-gesture shouldn't also activate the trigger's own click handler right after.
  useEventListener(
    options.triggerEl,
    'click',
    (event: MouseEvent) => {
      if (!suppressNextClick) return
      suppressNextClick = false
      event.preventDefault()
      event.stopPropagation()
    },
    true,
  )

  useEventListener(
    () => (toValue(options.interactive) !== false ? options.positionerEl.value : undefined),
    'pointerenter',
    () => {
      clearTimeout(closeTimer)
      if (isClosing.value) cancelClose()
    },
  )
  useEventListener(
    () => (toValue(options.interactive) !== false ? options.positionerEl.value : undefined),
    'pointerleave',
    () => scheduleClose(),
  )

  // Window capture runs before the layer stack's document listener, so a visible
  // tooltip takes this Escape and the dialog around it stays open (WCAG 1.4.13).
  useEventListener(
    () => (open.value ? ssrWindow() : undefined),
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || isClosing.value) return
      if (!toValue(options.closeOnEsc ?? true)) return
      requestClose('escape', event)
      if (!open.value || isClosing.value) event.preventDefault()
    },
    true,
  )

  watch(
    open,
    (value) => {
      if (value) {
        warmth.visible++
        visiblePeers.add(peer)
      } else {
        warmth.visible = Math.max(0, warmth.visible - 1)
        warmth.lastHideAt = performance.now()
        visiblePeers.delete(peer)
      }
    },
    { flush: 'post' },
  )

  onScopeDispose(() => {
    clearTimers()
    clearTravelSchedule()
    visiblePeers.delete(peer)
    if (open.value) {
      warmth.visible = Math.max(0, warmth.visible - 1)
      warmth.lastHideAt = performance.now()
    }
  })

  return {
    positionerStyle,
    panelStyle,
    placement,
    transformOrigin,
    isClosing,
    instant,
    traveling,
    morphing,
    travelActive,
    show,
    hide,
    requestClose,
    cancelClose,
    beginTravel,
    pointerEnter,
    pointerLeave,
    focusEnter,
    focusLeave,
    press,
  }
}

/** Adds or removes `id` as one token of `aria-describedby`, keeping the consumer's own ids. */
export function setDescribedBy(el: HTMLElement, id: string, on: boolean) {
  const ids = (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter((token) => token && token !== id)
  if (on) ids.push(id)
  if (ids.length) el.setAttribute('aria-describedby', ids.join(' '))
  else el.removeAttribute('aria-describedby')
}

/** Headless tooltip behavior bound to a trigger element. `Tooltip.vue` is a thin skin over this. */
export function useTooltip(open: Ref<boolean>, options: UseTooltipOptions) {
  const core = useTooltipCore(open, options)
  if (typeof window === 'undefined') return core

  useEventListener(options.triggerEl, 'pointerenter', core.pointerEnter)
  useEventListener(options.triggerEl, 'pointerleave', core.pointerLeave)
  useEventListener(options.triggerEl, 'focusin', core.focusEnter)
  useEventListener(options.triggerEl, 'focusout', core.focusLeave)
  useEventListener(options.triggerEl, 'pointerdown', core.press)

  return core
}
