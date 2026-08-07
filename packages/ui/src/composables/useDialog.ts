import { computed, nextTick, onMounted, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useLayer } from './useLayerStack'
import { useScrollLock } from './useScrollLock'
import { useInert } from './useInert'
import { useDOMTarget, type DOMTarget } from './dom'

export type DialogCloseReason = 'trigger' | 'escape' | 'outside' | 'programmatic'

export interface DialogOpenChangeDetails {
  reason: DialogCloseReason
  event?: Event
  cancel: () => void
}

export interface UseDialogOptions {
  panelEl: Ref<HTMLElement | null>
  /**
   * Outermost teleported node — the element the overlay and panel both live inside.
   * `useInert` spares this rather than `panelEl`, otherwise the overlay is a sibling
   * and goes inert, silently killing outside-click. Falls back to `panelEl`.
   */
  wrapperEl?: Ref<HTMLElement | null>
  /**
   * Scopes the dialog to one element: the overlay, scroll lock and modality apply
   * only inside it, and the rest of the page stays interactive.
   * Omit for a page-level dialog.
   */
  container?: MaybeRefOrGetter<DOMTarget>
  /**
   * Element whose scrolling is locked while open. Defaults to `container`, then
   * `document.body`. Keeping it separate lets the container stay unscrolled, so an
   * absolutely-positioned panel doesn't drift out of view.
   */
  scrollTarget?: MaybeRefOrGetter<DOMTarget>
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

  const { el: container } = useDOMTarget(() => toValue(options.container) ?? null)
  const { el: scrollTarget } = useDOMTarget(() => toValue(options.scrollTarget) ?? null)
  const contained = computed(() => container.value !== null)

  if (typeof window === 'undefined') {
    return { isClosing, close, requestClose, cancelClose, container, contained }
  }

  const contentEl = () => options.wrapperEl?.value ?? panelEl.value

  const layer = useLayer({
    // null -> page-level
    scope: container,
    content: contentEl,
    onDismiss: (_reason, event) => {
      if (!toValue(options.closeOnEsc ?? true)) return
      requestClose('escape', event)
    },
  })

  const scrollLocked = useScrollLock({
    target: () => scrollTarget.value ?? container.value ?? document.body,
  })

  // Contained only, for now. Applying inert page-wide would also silence anything
  // rendered outside the dialog — Toaster, PopoverHost, skip links — which the
  // Tab trap does not. That is a separate change from this feature.
  const inerted = useInert({
    root: () => container.value ?? document.body,
    content: contentEl,
  })

  let previouslyFocused: HTMLElement | null = null
  let active = false
  // Snapshot at activate() to avoid desync on reactive flips mid-open.
  let modalActive = true
  let containedActive = false
  const isOpen = shallowRef(false)

  function onDocumentKeydown(event: KeyboardEvent) {
    // Escape is dispatched by the layer stack, which picks a single winner by focus —
    // self-checking isTopmost() here would close both dialogs in sibling containers.
    if (event.key !== 'Tab' || !modalActive) return
    if (!layer.isTopmost()) return

    const panel = panelEl.value
    if (!panel) return
    const current = document.activeElement
    const inside = current instanceof HTMLElement && panel.contains(current)

    // cycle while focus is inside, but if the user intentionally focused
    // something outside, do not drag the focus back.
    if (!inside && containedActive) return

    const focusables = getFocusable(panel)
    if (focusables.length === 0) {
      event.preventDefault()
      panel.focus()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    if (!inside) {
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
    containedActive = contained.value
    layer.push()
    isOpen.value = true
    if (modalActive) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      scrollLocked.value = true
      // inert blurs whatever is focused inside it, so this must happen before the focus steal.
      if (containedActive) inerted.value = true
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
      scrollLocked.value = false
      inerted.value = false
      // the opener may have unmounted while we were open.
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true })
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

  return { isClosing, close, requestClose, cancelClose, container, scrollTarget, contained }
}
