import { onMounted, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { Side } from '@floating-ui/dom'
import { useLayer } from './useLayerStack'
import { useFloatingPosition } from './useFloatingPosition'
import type { Align } from './useFloatingPosition'

export type PopoverCloseReason = 'trigger' | 'escape' | 'outside' | 'programmatic'

export interface PopoverOpenChangeDetails {
  reason: PopoverCloseReason
  event?: Event
  cancel: () => void
}

export interface UsePopoverOptions {
  triggerEl: Ref<HTMLElement | null>
  positionerEl: Ref<HTMLElement | null>
  side?: MaybeRefOrGetter<Side>
  align?: MaybeRefOrGetter<Align>
  sideOffset?: MaybeRefOrGetter<number>
  alignOffset?: MaybeRefOrGetter<number>
  /** Forwarded to `useFloatingPosition` verbatim — see its own docs. Default false; only Select's panel passes true, Popover/Menu/Tooltip pass nothing and stay byte-for-byte unaffected. */
  matchReferenceWidth?: MaybeRefOrGetter<boolean>
  closeOnEsc?: MaybeRefOrGetter<boolean>
  closeOnOutside?: MaybeRefOrGetter<boolean>
  onOpenChange?: (value: boolean, details: PopoverOpenChangeDetails) => void
  /** Getter so the underlying prop stays reactive without being invoked by `toValue`. */
  beforeClose?: () => ((done: () => void) => void) | undefined
  /** Region this popover is scoped to, for Escape-key layer ownership. Omit for page-level. */
  scope?: Ref<HTMLElement | null>
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
    }
  }

  const layer = useLayer({ scope: options.scope, content: options.positionerEl })
  const isOpen = shallowRef(false)

  function onDocumentKeydown(event: KeyboardEvent) {
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

  function activate() {
    layer.push()
    isOpen.value = true
  }

  function deactivate() {
    layer.pop()
    isOpen.value = false
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
  }
}
