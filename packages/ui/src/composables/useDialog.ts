import { nextTick, onMounted, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useLayer } from './useLayerStack'

export type DialogCloseReason = 'trigger' | 'escape' | 'outside' | 'programmatic'

export interface DialogOpenChangeDetails {
  reason: DialogCloseReason
  event?: Event
  cancel: () => void
}

export interface UseDialogOptions {
  panelEl: Ref<HTMLElement | null>
  closeOnEsc?: MaybeRefOrGetter<boolean>
  /** Called before the model flips to false. Call `cancel()` on the details to veto the close. Components wire this to their `open-change` emit. */
  onOpenChange?: (value: boolean, details: DialogOpenChangeDetails) => void
  /** Getter so the underlying prop stays reactive without being invoked by `toValue`. */
  beforeClose?: () => ((done: () => void) => void) | undefined
  /** Overrides which element receives focus on open. Return null/undefined to fall back to the first focusable element (or the panel itself). */
  initialFocus?: () => HTMLElement | null | undefined
  /** Gates scroll-lock, the Tab focus-trap, and the initial-focus steal. Escape-close and layer stacking stay active either way. Default true. */
  modal?: MaybeRefOrGetter<boolean>
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0,
  )
}

// Shared across all dialog instances so nested/stacked dialogs don't restore
// body overflow while a sibling is still open.
let scrollLockCount = 0
let previousBodyOverflow = ''
let previousBodyPaddingRight = ''

function lockBodyScroll() {
  if (scrollLockCount++ === 0) {
    // Scrollbar removal shifts content left; compensate with padding
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    previousBodyOverflow = document.body.style.overflow
    previousBodyPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const currentPaddingRight =
        Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0
      document.body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`
    }
  }
}

function unlockBodyScroll() {
  if (scrollLockCount > 0 && --scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
    document.body.style.paddingRight = previousBodyPaddingRight
  }
}

/** Headless dialog: cancelable close, Escape, Tab trap, scroll lock, focus save/restore. */
export function useDialog(open: Ref<boolean>, options: UseDialogOptions) {
  const { panelEl } = options

  // Logically open but visually closing: exposes third state for animations.
  const isClosing = shallowRef(false)
  let pendingClose: symbol | null = null

  function requestClose(reason: DialogCloseReason, event?: Event) {
    if (!open.value) return
    if (isClosing.value) return
    let cancelled = false
    const details: DialogOpenChangeDetails = {
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
    return { isClosing, close, requestClose, cancelClose }
  }

  const layer = useLayer()
  let previouslyFocused: HTMLElement | null = null
  let active = false
  // Snapshot at activate() to avoid desync on reactive modal flip mid-open.
  let modalActive = true
  const isOpen = shallowRef(false)

  function onDocumentKeydown(event: KeyboardEvent) {
    // Only topmost layer reacts to Escape/Tab.
    if (!layer.isTopmost()) return

    if (event.key === 'Escape' && toValue(options.closeOnEsc ?? true)) {
      event.preventDefault()
      requestClose('escape', event)
      return
    }
    if (event.key !== 'Tab' || !modalActive) return

    const panel = panelEl.value
    if (!panel) return
    const focusables = getFocusable(panel)
    if (focusables.length === 0) {
      event.preventDefault()
      panel.focus()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const current = document.activeElement

    if (!(current instanceof HTMLElement) || !panel.contains(current)) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && (current === first || current === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  useEventListener(() => (isOpen.value ? document : undefined), 'keydown', onDocumentKeydown, true)

  function activate() {
    if (active) return
    active = true
    modalActive = toValue(options.modal ?? true)
    layer.push()
    isOpen.value = true
    if (modalActive) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      lockBodyScroll()
      // Focus immediately (don't wait for animation).
      nextTick(() => {
        const panel = panelEl.value
        if (!panel || !open.value) return
        const target = options.initialFocus?.() ?? getFocusable(panel)[0] ?? panel
        target.focus({ preventScroll: true })
      })
    }
  }

  function deactivate() {
    if (!active) return
    active = false
    layer.pop()
    isOpen.value = false
    if (modalActive) {
      unlockBodyScroll()
      previouslyFocused?.focus({ preventScroll: true })
    }
    previouslyFocused = null
    // Clear pending close on raw model writes mid-close.
    pendingClose = null
    isClosing.value = false
  }

  watch(open, (value) => (value ? activate() : deactivate()), { flush: 'post' })

  onMounted(() => {
    if (open.value) activate()
  })

  onScopeDispose(() => deactivate())

  return { isClosing, close, requestClose, cancelClose }
}
