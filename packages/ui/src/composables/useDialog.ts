import { computed, nextTick, onMounted, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useLayer } from './useLayerStack'
import { useScrollLock } from './useScrollLock'
import { useInert } from './useInert'
import { getFocusable, opener, useDOMTarget, type DOMTarget, type ElRef } from './dom'
import { ssrDocument } from '../ssr'
import { useCloseGuard } from './useCloseGuard'
import type { BeforeClose } from '../motion/types'

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
  beforeClose?: () => BeforeClose<DialogCloseReason> | undefined
  /** Overrides which element receives focus on open. Return null/undefined to fall back to the first focusable element (or the panel itself). */
  initialFocus?: () => HTMLElement | null | undefined
  /** Gates scroll-lock, the Tab focus-trap, and the initial-focus steal. Escape-close and layer stacking stay active either way. Default true. */
  modal?: MaybeRefOrGetter<boolean>
  /** Pushes a history entry on open so the mobile hardware/gesture back action closes this dialog instead of navigating the underlying page away, popping that entry again on any other close path. Default false — opt in per instance, since it alters the browser's history stack. */
  closeOnHistoryBack?: MaybeRefOrGetter<boolean>
  /**
   * Keeps the page's scroll locked after the model closes, until `releaseScroll()` is called
   * (Dialog calls it once its exit animation ends). Releasing at the start of the exit brings a
   * classic scrollbar back while the panel is still fading, and a panel centred in the viewport
   * jumps sideways by half its width. Default false: released as soon as the dialog closes.
   */
  holdScrollUntilExit?: boolean
}

// Toasts, live regions and tooltips outside the dialog; a control that is also a live region still goes inert.
const REACHABLE =
  '.ui-toaster, [aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"], [role="tooltip"]'
const CONTROL = 'button, a[href], input, select, textarea'

// Longer than any built-in exit, so it only fires if the exit never reports its end.
const EXIT_FALLBACK_MS = 1000

// Shared across dialogs: each popstate must be judged once against every open entry.
let lastHistoryId = 0
let pendingBacks = 0
const historyOwners = new Map<number, () => void>()
const deferredPushes = new Map<number, () => void>()
let popStateListening = false

function onPopState() {
  if (pendingBacks > 0) {
    // Our own back() landing.
    pendingBacks--
    if (pendingBacks === 0) {
      const pushes = [...deferredPushes.values()]
      deferredPushes.clear()
      pushes.forEach((push) => push())
    }
  } else {
    const current = history.state?.__uiDialog
    const live = typeof current === 'number' ? current : 0
    for (const [id, close] of historyOwners) {
      if (id <= live) continue
      historyOwners.delete(id)
      close()
    }
  }
  syncPopStateListener()
}

function syncPopStateListener() {
  const shouldListen = historyOwners.size > 0 || pendingBacks > 0
  if (shouldListen === popStateListening) return
  popStateListening = shouldListen
  if (shouldListen) window.addEventListener('popstate', onPopState)
  else window.removeEventListener('popstate', onPopState)
}

/** Headless dialog: cancelable close, Escape, Tab trap, scroll lock, focus save/restore. */
export function useDialog(open: Ref<boolean>, options: UseDialogOptions) {
  const { panelEl } = options

  const {
    isClosing,
    close: closeGuarded,
    cancelClose,
  } = useCloseGuard(open, () => options.beforeClose?.())

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

    closeGuarded(reason)
  }

  function close() {
    requestClose('programmatic')
  }

  // Back-navigation dismiss: push one history entry on open, pop it again on any OTHER close path
  // so the stack stays balanced. Entries carry an increasing id, and the shared popstate handler
  // closes only the dialogs whose entry is gone, so popping an inner dialog's entry never closes
  // the outer one. `history.state` is checked before popping so we only ever consume our own
  // still-current entry, never an app router's newer navigation.
  let historyId = 0

  function pushHistoryEntry() {
    if (!toValue(options.closeOnHistoryBack) || typeof history === 'undefined') return
    historyId = ++lastHistoryId
    const id = historyId
    const push = () => {
      try {
        history.pushState({ __uiDialog: id }, '')
        historyOwners.set(id, () => {
          historyId = 0
          requestClose('history')
        })
      } catch {
        // Some engines throttle pushState - fail safe: no entry pushed, no back-gesture-close this time.
        historyId = 0
      }
      syncPopStateListener()
    }
    // A back() from an earlier close is still in flight: pushing now would let it pop this entry.
    if (pendingBacks > 0) deferredPushes.set(id, push)
    else push()
  }

  function popHistoryEntryIfOwned() {
    const id = historyId
    if (!id) return
    historyId = 0
    if (deferredPushes.delete(id)) return
    historyOwners.delete(id)
    if (history.state?.__uiDialog === id) {
      pendingBacks++
      history.back()
    }
    syncPopStateListener()
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
    target: () => scrollTarget.value ?? container.value ?? ssrDocument()?.body ?? null,
  })

  const isOpen = shallowRef(false)

  // Spared while the rest goes inert: toasts stay clickable, live regions still announce, tooltips still describe.
  // One that appears later (a tooltip teleported into a box that was already inert) re-reads them.
  const domTick = shallowRef(0)
  const reachable = () => {
    void domTick.value
    return [...document.querySelectorAll<HTMLElement>(REACHABLE)].filter(
      (el) => !el.matches(CONTROL),
    )
  }
  let newcomers: MutationObserver | undefined
  watch(isOpen, (open) => {
    newcomers?.disconnect()
    newcomers = undefined
    if (!open || typeof MutationObserver === 'undefined') return
    newcomers = new MutationObserver((records) => {
      const arrived = records.some((record) =>
        [...record.addedNodes].some(
          (node) =>
            node instanceof Element &&
            (node.matches(REACHABLE) || node.querySelector(REACHABLE) !== null),
        ),
      )
      if (arrived) domTick.value++
    })
    newcomers.observe(document.body, { childList: true, subtree: true })
  })
  onScopeDispose(() => newcomers?.disconnect())

  // Overlays opened on top (a popover, a nested dialog) stay reachable too, re-read as they open.
  const inerted = useInert({
    root: () => container.value ?? ssrDocument()?.body ?? null,
    content: () => (isOpen.value ? [contentEl(), ...layer.above(), ...reachable()] : contentEl()),
  })

  let previouslyFocused: HTMLElement | null = null
  let active = false
  // holdScrollUntilExit: whether this open's exit has finished, and a release in case it never reports.
  let exitEnded = false
  let exitFallback: ReturnType<typeof setTimeout> | undefined
  let exitEl: HTMLElement | null = null
  // Snapshot at activate() to avoid desync on reactive flips mid-open.
  let modalActive = true
  let containedActive = false

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

  useEventListener(
    () => (isOpen.value ? ssrDocument() : undefined),
    'keydown',
    onDocumentKeydown,
    true,
  )

  function activate() {
    if (active) return
    active = true
    exitEnded = false
    clearTimeout(exitFallback)
    exitEl = contentEl() ?? null
    modalActive = toValue(options.modal ?? true)
    containedActive = contained.value
    layer.push()
    isOpen.value = true
    pushHistoryEntry()
    if (modalActive) {
      // What opened it, even in Safari (a clicked button isn't focused there): focus goes back to it.
      previouslyFocused = opener()
      scrollLocked.value = true
      // inert blurs whatever is focused inside it, so this must happen before the focus steal.
      inerted.value = true
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
      // Nothing to wait for when the exit already ended (forceMount, no animation) or the dialog left
      // the page at once (a stubbed <Transition> in tests). Vue clears the template ref on close,
      // hence the element captured at open.
      if (!options.holdScrollUntilExit || exitEnded || !exitEl?.isConnected)
        scrollLocked.value = false
      else exitFallback = setTimeout(releaseScroll, EXIT_FALLBACK_MS)
      inerted.value = false
      // the opener may have unmounted while we were open.
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true })
    }
    previouslyFocused = null
    exitEl = null
    // Clear pending close on raw model writes mid-close.
    cancelClose()
  }

  watch(open, (value) => (value ? activate() : deactivate()), { flush: 'post' })

  onMounted(() => {
    if (open.value) activate()
  })

  onScopeDispose(() => {
    deactivate()
    clearTimeout(exitFallback)
  })

  /** Ends a lock held by `holdScrollUntilExit`. A no-op while open, so a reopen mid-exit keeps it. */
  function releaseScroll() {
    clearTimeout(exitFallback)
    exitEnded = true
    if (!open.value) scrollLocked.value = false
  }

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
    releaseScroll,
  }
}
