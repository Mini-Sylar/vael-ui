import { onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { Side } from '@floating-ui/dom'
import { useFloatingPosition } from './useFloatingPosition'
import type { Align } from './useFloatingPosition'

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
  triggerEl: Ref<HTMLElement | null>
  positionerEl: Ref<HTMLElement | null>
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
  const REPOSITION_MIN_DISTANCE = 4

  function repositionDistance(before: Record<string, string>, after: Record<string, string>) {
    return Math.hypot(
      Number.parseFloat(after.left) - Number.parseFloat(before.left),
      Number.parseFloat(after.top) - Number.parseFloat(before.top),
    )
  }

  watch(floatingStyle, (next) => {
    const wasVisible = positionerStyle.value.visibility === 'visible'
    const isVisible = next.visibility === 'visible'
    if (isVisible && travelFrom) {
      const from = travelFrom
      travelFrom = null
      const el = options.positionerEl.value
      const targetWidth = el?.offsetWidth ?? from.width
      const targetHeight = el?.offsetHeight ?? from.height
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
      if (distance > TRAVEL_MAX_DISTANCE || ratio > TRAVEL_MAX_SIZE_RATIO) {
        traveling.value = false
        positionerStyle.value = next
        return
      }
      const token = ++travelToken
      traveling.value = false
      positionerStyle.value = {
        ...next,
        top: `${from.top}px`,
        left: `${from.left}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
      }
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (token !== travelToken || positionerStyle.value.visibility !== 'visible') return
          traveling.value = true
          positionerStyle.value = {
            ...next,
            width: `${targetWidth}px`,
            height: `${targetHeight}px`,
          }
          setTimeout(() => {
            if (token !== travelToken || positionerStyle.value.visibility !== 'visible') return
            traveling.value = false
            positionerStyle.value = { ...floatingStyle.value }
          }, 180)
        }),
      )
      return
    }
    if (wasVisible && isVisible) {
      if (repositionDistance(positionerStyle.value, next) > REPOSITION_MIN_DISTANCE) {
        const token = ++travelToken
        traveling.value = true
        positionerStyle.value = next
        setTimeout(() => {
          if (token !== travelToken || positionerStyle.value.visibility !== 'visible') return
          traveling.value = false
        }, 180)
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
