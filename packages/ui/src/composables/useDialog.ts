import { computed, nextTick, onMounted, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useLayer } from './useLayerStack'
import { useScrollLock } from './useScrollLock'
import { useInert } from './useInert'
import { useDOMTarget, type DOMTarget, type ElRef } from './dom'

export type DialogCloseReason = 'trigger' | 'escape' | 'outside' | 'history' | 'programmatic'

export interface DialogOpenChangeDetails {
  reason: DialogCloseReason
  event?: Event
  cancel: () => void
}

export interface UseDialogOptions {
  panelEl: ElRef<HTMLElement | null>
  /**
   * Outermost teleported node — the element the overlay and panel both live inside.
   * `useInert` spares this rather than `panelEl`, otherwise the overlay is a sibling
   * and goes inert, silently killing outside-click. Falls back to `panelEl`.
   */
  wrapperEl?: ElRef<HTMLElement | null>
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
  /** Pushes a history entry on open so the mobile hardware/gesture back action closes this dialog instead of navigating the underlying page away, popping that entry again on any other close path. Default false — opt in per instance, since it alters the browser's history stack. */
  closeOnHistoryBack?: MaybeRefOrGetter<boolean>
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

  // Back-navigation dismiss: push one history entry on open, pop it again on any OTHER close path
  // (`popHistoryEntryIfOwned`) so the stack stays balanced; a real back gesture instead fires
  // `popstate` first, which closes the dialog and marks the entry as already gone so the
  // resulting `deactivate()` doesn't also call `history.back()` and consume a second entry.
  //
  // Two things this guards against, both real with nested dialogs or an app router sharing the
  // same history stack: (1) every open dialog's `popstate` listener fires on the SAME back
  // action, not just the one whose entry actually got popped - only the topmost dialog may treat
  // it as its own, via `layer.isTopmost()`, so an underlying dialog's own bookkeeping isn't
  // clobbered by a pop that wasn't its entry. (2) something else (the app's own router) may have
  // pushed a newer entry on top of ours before we close normally - `history.state` is checked
  // right before popping so we only ever consume OUR OWN still-current entry, never someone
  // else's navigation.
  let pushedHistoryEntry = false
  let ignoreNextPopstate = false

  function pushHistoryEntry() {
    if (!toValue(options.closeOnHistoryBack) || typeof history === 'undefined') return
    try {
      history.pushState({ __uiDialog: true }, '')
      pushedHistoryEntry = true
    } catch {
      // Some engines throttle pushState - fail safe: no entry pushed, no back-gesture-close this time.
    }
  }

  function popHistoryEntryIfOwned() {
    if (!pushedHistoryEntry) return
    pushedHistoryEntry = false
    if (typeof history === 'undefined' || history.state?.__uiDialog !== true) return
    ignoreNextPopstate = true
    history.back()
  }

  function onPopState() {
    if (ignoreNextPopstate) {
      ignoreNextPopstate = false
      return
    }
    if (!pushedHistoryEntry || !layer.isTopmost()) return
    pushedHistoryEntry = false
    requestClose('history')
  }

  const { el: container } = useDOMTarget(() => toValue(options.container) ?? null)
  const { el: scrollTarget } = useDOMTarget(() => toValue(options.scrollTarget) ?? null)
  const contained = computed(() => container.value !== null)

  if (typeof window === 'undefined') {
    return {
      isClosing,
      close,
      requestClose,
      cancelClose,
      container,
      contained,
      layerIndex: () => 0,
    }
  }

  // Panel needs `container` to be a positioning context, or it falls through to whatever
  // ancestor is positioned instead. Give it one if it doesn't already have one.
  watch(
    container,
    (el) => {
      if (el && getComputedStyle(el).position === 'static') {
        el.style.position = 'relative'
      }
    },
    { immediate: true },
  )

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
  useEventListener(
    () => (typeof window === 'undefined' ? undefined : window),
    'popstate',
    onPopState,
  )

  function activate() {
    if (active) return
    active = true
    modalActive = toValue(options.modal ?? true)
    containedActive = contained.value
    layer.push()
    isOpen.value = true
    pushHistoryEntry()
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
    popHistoryEntryIfOwned()
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

  return {
    isClosing,
    close,
    requestClose,
    cancelClose,
    container,
    scrollTarget,
    contained,
    // Only the index, not the whole Layer object - a caller (Dialog.vue, for its own z-index) has
    // no business calling .push()/.pop() itself, since this hook already owns that lifecycle
    // above (activate/deactivate) and a second registration for the same dialog would give it two
    // stack slots instead of one, breaking isTopmost()/Escape-routing/scroll-lock ref-counting for
    // every dialog on the page.
    layerIndex: layer.index,
  }
}
