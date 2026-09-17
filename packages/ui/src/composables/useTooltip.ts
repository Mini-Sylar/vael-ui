import { onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { onLongPress, useEventListener } from '@vueuse/core'
import type { Side } from '@floating-ui/dom'
import { useFloatingPosition } from './useFloatingPosition'
import type { Align } from './useFloatingPosition'
import type { ElRef } from './dom'

export type TooltipCloseReason = 'pointer' | 'focus' | 'trigger' | 'escape' | 'programmatic'

export interface TooltipOpenChangeDetails {
  reason: TooltipCloseReason | 'hover' | 'focus-visible' | 'programmatic'
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
  const traveling = shallowRef(false)
  const positionerStyle = shallowRef<Record<string, string>>(floatingStyle.value)
  let travelFrom: TravelRect | null = null
  let travelToken = 0

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

  const TRAVEL_MAX_DISTANCE = 320
  const TRAVEL_MAX_SIZE_RATIO = 1.75
  // A ratio alone over-triggers for small tooltips: two adjacent toolbar tooltips at 40px and
  // 72px width are a 1.8x ratio but only a 32px gap — nowhere near the visible "stretch" a ratio
  // that high implies for larger content. Only let the ratio bail out once the absolute gap is
  // big enough to actually read as one.
  const TRAVEL_MIN_SIZE_DELTA_FOR_RATIO = 60
  const REPOSITION_MIN_DISTANCE = 4
  // Matches the CSS transition duration below (--ui-duration-tooltip, 125ms) plus a small buffer
  // for it to actually finish painting — not an independent value to keep in sync by hand.
  const TRAVEL_SETTLE_MS = 150

  function repositionDistance(before: Record<string, string>, after: Record<string, string>) {
    return Math.hypot(
      Number.parseFloat(after.left) - Number.parseFloat(before.left),
      Number.parseFloat(after.top) - Number.parseFloat(before.top),
    )
  }

  // floating-ui's autoUpdate fires its callback more than once right after a reference swap (its
  // own observers settling independently, sometimes several ms apart, well after the RAFs below
  // resolve) — for the ENTIRE lifetime of a travel below (staging the from-state through the full
  // settle), any of those extra fires must be ignored: `positionerStyle` holds a value the plain
  // reposition branch would otherwise misread as a large, sudden jump — snapping straight to the
  // target (if it arrives during the staged from-state) or cutting the transition short partway
  // through (if it arrives after `traveling` has already gone true). They carry no new
  // information the travel below didn't already capture.
  //
  // Reactive (not a plain flag) because it also drives the panel's own clip/no-wrap CSS for that
  // whole span, not just while `traveling` (the CSS-transition-enabled portion) is true: content
  // already swapped to the new target the instant the trigger did, but the box is briefly pinned
  // to the FROM size — a label that only fits on one line at its real target width wraps to two
  // at that narrower size, and without a no-wrap panel that extra line is fully visible for a
  // frame before `overflow` clips it back down, reading as a flash of wrapped/doubled text.
  const travelActive = shallowRef(false)
  // Handles for whatever's still pending from the travel/reposition branches below — cancelled
  // outright (not just token-invalidated) whenever a newer one supersedes them, and on scope
  // dispose, so a `<Tooltip>` unmounted mid-transition doesn't leave a stray rAF/timeout holding
  // its closure (and everything it captured) alive until it happens to fire on its own.
  let travelRaf1: number | undefined
  let travelRaf2: number | undefined
  let settleTimer: ReturnType<typeof setTimeout> | undefined

  function clearTravelSchedule() {
    if (travelRaf1 !== undefined) cancelAnimationFrame(travelRaf1)
    if (travelRaf2 !== undefined) cancelAnimationFrame(travelRaf2)
    clearTimeout(settleTimer)
    travelRaf1 = travelRaf2 = settleTimer = undefined
    travelActive.value = false
  }

  watch(floatingStyle, (next) => {
    const wasVisible = positionerStyle.value.visibility === 'visible'
    const isVisible = next.visibility === 'visible'
    if (isVisible && travelFrom) {
      const from = travelFrom
      travelFrom = null
      const el = options.positionerEl.value
      const targetRect = el?.getBoundingClientRect()
      const targetWidth = targetRect?.width ?? from.width
      const targetHeight = targetRect?.height ?? from.height
      const distance = Math.hypot(
        Number.parseFloat(next.left) - from.left,
        Number.parseFloat(next.top) - from.top,
      )
      const ratio = Math.max(
        targetWidth / from.width,
        from.width / targetWidth,
        targetHeight / from.height,
        from.height / targetHeight,
      )
      const sizeDelta = Math.max(
        Math.abs(targetWidth - from.width),
        Math.abs(targetHeight - from.height),
      )
      if (
        distance > TRAVEL_MAX_DISTANCE ||
        (ratio > TRAVEL_MAX_SIZE_RATIO && sizeDelta > TRAVEL_MIN_SIZE_DELTA_FOR_RATIO)
      ) {
        traveling.value = false
        positionerStyle.value = next
        return
      }
      clearTravelSchedule()
      const token = ++travelToken
      travelActive.value = true
      traveling.value = false
      positionerStyle.value = {
        ...next,
        top: `${from.top}px`,
        left: `${from.left}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
      }
      travelRaf1 = requestAnimationFrame(() => {
        travelRaf2 = requestAnimationFrame(() => {
          travelRaf1 = travelRaf2 = undefined
          if (token !== travelToken || positionerStyle.value.visibility !== 'visible') {
            travelActive.value = false
            return
          }
          traveling.value = true
          positionerStyle.value = {
            ...next,
            width: `${targetWidth}px`,
            height: `${targetHeight}px`,
          }
          settleTimer = setTimeout(() => {
            settleTimer = undefined
            travelActive.value = false
            if (token !== travelToken || positionerStyle.value.visibility !== 'visible') return
            traveling.value = false
            positionerStyle.value = { ...floatingStyle.value }
          }, TRAVEL_SETTLE_MS)
        })
      })
      return
    }
    if (travelActive.value) return
    if (wasVisible && isVisible) {
      if (repositionDistance(positionerStyle.value, next) > REPOSITION_MIN_DISTANCE) {
        clearTravelSchedule()
        const token = ++travelToken
        traveling.value = true
        positionerStyle.value = next
        settleTimer = setTimeout(() => {
          settleTimer = undefined
          if (token !== travelToken || positionerStyle.value.visibility !== 'visible') return
          traveling.value = false
        }, TRAVEL_SETTLE_MS)
        return
      }
      traveling.value = false
      positionerStyle.value = next
      return
    }
    traveling.value = false
    positionerStyle.value = next
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
      placement,
      transformOrigin,
      isClosing,
      instant,
      traveling,
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
      for (const other of visiblePeers) {
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
  })
  // VueUse's own long-press primitive (500ms delay, 10px move tolerance to cancel, both matching
  // platform convention) - it fires for every pointer type, so the handler itself gates on touch.
  onLongPress(
    options.triggerEl,
    (event) => {
      if (event.pointerType === 'touch') show()
    },
    {
      onMouseUp: (_duration, _distance, isLongPress, event) => {
        if (isLongPress && event.pointerType === 'touch') suppressNextClick = true
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

  // Don't preventDefault (closing both better than swallowing Escape).
  useEventListener(
    () => (open.value ? document : undefined),
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && toValue(options.closeOnEsc ?? true)) {
        requestClose('escape', event)
      }
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
    placement,
    transformOrigin,
    isClosing,
    instant,
    traveling,
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
