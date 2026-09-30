import { onMounted, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { Side } from '@floating-ui/dom'
import { useLayer } from './useLayerStack'
import { useFloatingPosition } from './useFloatingPosition'
import type { Align } from './useFloatingPosition'
import { focusTargetIn, getFocusable } from './dom'
import type { ElRef } from './dom'

export type PopoverCloseReason = 'trigger' | 'escape' | 'outside' | 'programmatic'

export interface PopoverOpenChangeDetails {
  reason: PopoverCloseReason
  event?: Event
  cancel: () => void
}

export interface UsePopoverOptions {
  triggerEl: ElRef<HTMLElement | null>
  positionerEl: ElRef<HTMLElement | null>
  side?: MaybeRefOrGetter<Side>
  align?: MaybeRefOrGetter<Align>
  sideOffset?: MaybeRefOrGetter<number>
  alignOffset?: MaybeRefOrGetter<number>
  /** Forwarded to `useFloatingPosition` verbatim — see its own docs. Default false; only Select's panel passes true, Popover/Menu/Tooltip pass nothing and stay byte-for-byte unaffected. */
  matchReferenceWidth?: MaybeRefOrGetter<boolean>
  /** Forwarded to `useFloatingPosition` verbatim — caps the panel's height budget even when the viewport has more room. */
  maxHeightCap?: MaybeRefOrGetter<number | undefined>
  closeOnEsc?: MaybeRefOrGetter<boolean>
  closeOnOutside?: MaybeRefOrGetter<boolean>
  onOpenChange?: (value: boolean, details: PopoverOpenChangeDetails) => void
  /** Getter so the underlying prop stays reactive without being invoked by `toValue`. */
  beforeClose?: () => ((done: () => void) => void) | undefined
  /** Region this popover is scoped to, for Escape-key layer ownership. Omit for page-level. */
  scope?: ElRef<HTMLElement | null>
  /** Tab from the trigger enters the panel, and Tab past its ends closes it and continues from the trigger. For panels that take focus (Popover, Menu); leave off where focus stays on the trigger (Combobox). */
  tabIntoPanel?: boolean
}

export function usePopover(open: Ref<boolean>, options: UsePopoverOptions) {
  const { positionerStyle, placement, transformOrigin, maxHeight } = useFloatingPosition({
    referenceEl: options.triggerEl,
    floatingEl: options.positionerEl,
    active: open,
    side: options.side,
    align: options.align,
    sideOffset: options.sideOffset,
    alignOffset: options.alignOffset,
    matchReferenceWidth: options.matchReferenceWidth,
    maxHeightCap: options.maxHeightCap,
  })

  // Logically open but visually closing: exposes third state for animations.
  const isClosing = shallowRef(false)
  let pendingClose: symbol | null = null

  function requestClose(reason: PopoverCloseReason, event?: Event) {
    if (!open.value) return
    if (isClosing.value) return
    let cancelled = false
    const details: PopoverOpenChangeDetails = {
      reason,
      event,
      cancel: () => {
        cancelled = true
      },
    }
    options.onOpenChange?.(false, details)
    if (cancelled) return

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

  function close() {
    requestClose('programmatic')
  }

  if (typeof window === 'undefined') {
    return {
      positionerStyle,
      placement,
      transformOrigin,
      maxHeight,
      isClosing,
      close,
      requestClose,
      cancelClose,
      layerIndex: () => 0,
    }
  }

  const layer = useLayer({ scope: options.scope, content: options.positionerEl })
  const isOpen = shallowRef(false)

  function onDocumentKeydown(event: KeyboardEvent) {
    // A layer above already handled this Escape and popped itself; without
    // this, the popover underneath would see itself topmost and close too.
    if (event.defaultPrevented) return
    if (!layer.isTopmost()) return
    if (event.key === 'Escape' && toValue(options.closeOnEsc ?? true)) {
      event.preventDefault()
      requestClose('escape', event)
    }
  }

  function isOutside(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false
    // Trigger is consumer's job; don't close on trigger click.
    if (options.triggerEl.value?.contains(target)) return false
    if (options.positionerEl.value?.contains(target)) return false
    return true
  }

  function onDocumentPointerdown(event: PointerEvent) {
    if (!layer.isTopmost()) return
    if (!toValue(options.closeOnOutside ?? true)) return
    if (isOutside(event.target)) requestClose('outside', event)
  }

  // Tab doesn't fire pointerdown; must close on focus-outside for keyboard.
  function onDocumentFocusin(event: FocusEvent) {
    const panel = options.positionerEl.value
    if (panel?.contains(event.target as Node | null)) {
      focusWasInside = true
      lastPanel = panel
    }
    if (!layer.isTopmost()) return
    if (!toValue(options.closeOnOutside ?? true)) return
    if (isOutside(event.target)) requestClose('outside', event)
  }

  useEventListener(() => (isOpen.value ? document : undefined), 'keydown', onDocumentKeydown, true)
  useEventListener(
    () => (isOpen.value ? document : undefined),
    'pointerdown',
    onDocumentPointerdown,
    true,
  )
  useEventListener(() => (isOpen.value ? document : undefined), 'focusin', onDocumentFocusin, true)

  // The panel is teleported, so it isn't next to its trigger in tab order.
  // Tab from the trigger steps into the panel; Tab past either end of the
  // panel closes it and carries on from the trigger, instead of dropping
  // focus at the end of <body>. Bubble phase, so a focus trap inside the
  // panel handles its own Tab first.
  function onDocumentTab(event: KeyboardEvent) {
    if (event.key !== 'Tab' || event.defaultPrevented) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (!layer.isTopmost()) return
    const panel = options.positionerEl.value
    const trigger = options.triggerEl.value
    const active = document.activeElement
    if (!panel || !(trigger instanceof HTMLElement) || !(active instanceof HTMLElement)) return
    const inside = getFocusable(panel)
    if (trigger.contains(active)) {
      if (event.shiftKey || inside.length === 0) return
      event.preventDefault()
      inside[0]!.focus()
      return
    }
    if (!panel.contains(active)) return
    const index = inside.indexOf(active)
    if (index === -1 && !event.shiftKey && inside.length > 0) {
      event.preventDefault()
      inside[0]!.focus()
      return
    }
    const leaving = event.shiftKey ? index <= 0 : index === inside.length - 1
    if (!leaving) return
    event.preventDefault()
    const triggerTarget = focusTargetIn(trigger) ?? trigger
    if (event.shiftKey) triggerTarget.focus()
    else focusAfter(triggerTarget, panel)
    if (toValue(options.closeOnOutside ?? true)) requestClose('outside', event)
  }
  useEventListener(
    () => (isOpen.value && options.tabIntoPanel ? document : undefined),
    'keydown',
    onDocumentTab,
  )

  function focusAfter(el: HTMLElement, panel: HTMLElement) {
    const next = getFocusable(document.body).find(
      (candidate) =>
        !panel.contains(candidate) &&
        !el.contains(candidate) &&
        el.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING,
    )
    ;(next ?? el).focus()
  }

  // Focus goes back to whatever had it before opening (Dialog does the same),
  // but only if it's still inside the closing panel, or it was in the panel
  // and got lost to <body> when the content unmounted. A click or Tab that
  // already moved it somewhere real is left alone.
  let returnFocusTo: HTMLElement | null = null
  let focusWasInside = false
  // Vue clears the template ref as the panel starts leaving, while it's still
  // on screen (and may still hold focus) for its exit transition.
  let lastPanel: HTMLElement | null = null
  function rememberFocus() {
    const active = document.activeElement
    lastPanel = options.positionerEl.value
    focusWasInside = !!lastPanel?.contains(active)
    returnFocusTo =
      active instanceof HTMLElement &&
      active !== document.body &&
      !options.positionerEl.value?.contains(active)
        ? active
        : null
  }
  function restoreFocus() {
    const trigger = options.triggerEl.value
    const target =
      returnFocusTo ?? (trigger instanceof HTMLElement ? focusTargetIn(trigger) : undefined)
    returnFocusTo = null
    const active = document.activeElement
    const panel = options.positionerEl.value ?? lastPanel
    lastPanel = null
    const inPanel = !!active && !!panel?.contains(active)
    const lostFromPanel = focusWasInside && (!active || active === document.body)
    focusWasInside = false
    if ((inPanel || lostFromPanel) && target?.isConnected) target.focus({ preventScroll: true })
  }

  function activate() {
    layer.push()
    isOpen.value = true
    rememberFocus()
  }

  function deactivate() {
    const wasOpen = isOpen.value
    layer.pop()
    isOpen.value = false
    if (wasOpen) restoreFocus()
    // Clear pending close on raw model writes mid-close.
    pendingClose = null
    isClosing.value = false
  }

  watch(open, (value) => (value ? activate() : deactivate()), { flush: 'post' })

  onMounted(() => {
    if (open.value) activate()
  })

  onScopeDispose(() => deactivate())

  return {
    positionerStyle,
    placement,
    transformOrigin,
    maxHeight,
    isClosing,
    close,
    requestClose,
    cancelClose,
    // Same shared stack useDialog.ts already uses for Dialog/Drawer/BottomSheet's own z-index.
    layerIndex: layer.index,
  }
}
