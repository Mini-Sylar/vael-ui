import { nextTick, onBeforeUpdate, shallowRef, toValue, watch } from 'vue'
import type { Ref, ShallowRef, MaybeRefOrGetter, Slots } from 'vue'
import { isClient, tryOnMounted } from '@vueuse/core'

export type DOMTarget = HTMLElement | string | null

/**
 * What a DOM-element option should accept instead of a plain `Ref<T>` — every consumer here only
 * ever reads `.value`, and the overwhelmingly common caller is `useTemplateRef()`, which returns
 * `Readonly<ShallowRef<T>>`, not a full writable `Ref<T>`. A plain `Ref<T>` parameter type rejects
 * that at the type level even though it works fine at runtime.
 */
export type ElRef<T> = Ref<T> | Readonly<ShallowRef<T>>

export function resolveDOMTarget(target: undefined): undefined
export function resolveDOMTarget(target: DOMTarget): HTMLElement | null
export function resolveDOMTarget(target: DOMTarget | undefined): HTMLElement | null | undefined

export function resolveDOMTarget(target: DOMTarget | undefined): HTMLElement | null | undefined {
  if (target === undefined) return undefined
  if (target === null) return null
  if (!isClient) return null
  if (typeof target === 'string') {
    try {
      return document.querySelector<HTMLElement>(target)
    } catch {
      // for invalid selector
      return null
    }
  }
  return target
}

function hasZeroRect(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0
}

/**
 * A `display: contents` element has a zero rect — useless as a floating-ui reference and wrong
 * for aria-describedby/positioning generally. Descends to the first element that actually
 * generates a box, same logic vTooltip's directive uses for the same reason.
 *
 * Also descends past a wrapper that isn't `display: contents` but still measures a zero rect at
 * `(0, 0)` - the exact shape of a `#trigger`-slot wrapper caught before its first real layout
 * (Menu's own trigger-anchoring resolves this at the same point in the render cycle every other
 * `display: contents` check runs, and a not-yet-measured wrapper is indistinguishable from a
 * `display: contents` one by rect alone). Without this, `computePosition` was handed that zero
 * rect as the reference element and fell back to floating-ui's `top: 0px; left: 0px` default,
 * anchoring the menu/popover to the viewport's top-left corner instead of the real trigger.
 *
 * That zero-rect fallback only applies to `el` itself. Below it, only `display: contents` is
 * skipped: a real element that measures zero is hidden (e.g. inside a closed BottomSheet), and
 * descending into it lands on internals like a Button's spinning loader.
 */
export function resolvePastDisplayContents(el: HTMLElement): HTMLElement {
  let target = el
  while (target.firstElementChild instanceof HTMLElement) {
    const isDisplayContents = getComputedStyle(target).display === 'contents'
    if (!isDisplayContents && (target !== el || !hasZeroRect(target))) break
    target = target.firstElementChild
  }
  return target
}

export interface UseDOMTargetReturn {
  /** The resolved element, or `null` while unresolved. */
  el: Readonly<ShallowRef<HTMLElement | null>>
  /** Manual refresh. Only useful for selectors, whose match can change silently. */
  refresh: () => void
}

/**
 * Normalises any `DOMTarget` — element, ref, `useTemplateRef`, getter, or selector —
 * into a plain element ref.
 *
 * This is the only place selectors are understood. The primitives downstream
 * (`useScrollLock`, `useLayer`) take elements, so a selector resolves once here and
 * every consumer sees the same node rather than each running its own query.
 *
 * A selector has no reactive dependency on the DOM, so it is resolved on mount and
 * whenever the target itself changes. If the matching element can be replaced after
 * that, pass a ref instead — or call `resolve()` yourself.
 */
export function useDOMTarget(target: MaybeRefOrGetter<DOMTarget>): UseDOMTargetReturn {
  const el = shallowRef<HTMLElement | null>(null)

  const refresh = () => {
    el.value = resolveDOMTarget(toValue(target))
  }

  watch(() => toValue(target), refresh, { immediate: true })

  tryOnMounted(refresh)

  return { el, refresh }
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Visible Tab stops inside `root`, in DOM order. A `tabindex="-1"` button (a roving menu item) isn't one. */
export function getFocusable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.tabIndex >= 0 && el.getClientRects().length > 0,
  )
}

/** `el` itself when it's focusable, else the first focusable element inside it. */
export function focusTargetIn(el: HTMLElement): HTMLElement | undefined {
  return el.matches(FOCUSABLE_SELECTOR) ? el : getFocusable(el)[0]
}

/**
 * A native tag for `<component :is>`, written in capitals. Vue resolves a string `is` against
 * registered components first, ignoring case, so `'button'` would render a globally registered
 * `Button`, and vael-ui's own Button would then render itself forever. HTML tag names are
 * case-insensitive, so `'BUTTON'` still creates a `<button>`. Component names (`'RouterLink'`,
 * `'router-link'`) pass through unchanged and still resolve.
 */
export function nativeTag<T>(as: T): T {
  return (typeof as === 'string' && /^[a-z][a-z0-9]*$/.test(as) ? as.toUpperCase() : as) as T
}

export interface ClickGuard {
  arm: () => void
  /** True once if armed, for the click handler to cancel the event. */
  consume: () => boolean
  disarm: () => void
}

/**
 * Swallows the click a drag's release can produce. The release gets no click when it lands
 * on another element, so the next press or key disarms the guard instead of letting it eat
 * a real click later.
 */
export function createClickGuard(): ClickGuard {
  let armed = false
  const opts = { capture: true, passive: true }
  function disarm() {
    if (!armed) return
    armed = false
    window.removeEventListener('pointerdown', disarm, opts)
    window.removeEventListener('keydown', disarm, opts)
  }
  return {
    arm() {
      if (armed) return
      armed = true
      window.addEventListener('pointerdown', disarm, opts)
      window.addEventListener('keydown', disarm, opts)
    },
    consume() {
      const was = armed
      disarm()
      return was
    },
    disarm,
  }
}

/**
 * `:ref` callback for a `<TransitionGroup>` that also renders `:data-ui-group="key"`. vdom hands
 * over the component, whose `$el` is the element. Vapor hands over an object without one, so the
 * element is found by that attribute once it's in the document.
 */
export function transitionGroupRef(target: Ref<HTMLElement | null>, key: string) {
  return (el: Element | { $el?: unknown } | null): void => {
    if (!el) target.value = null
    else if (el instanceof HTMLElement) target.value = el
    else if ('$el' in el && el.$el instanceof HTMLElement) target.value = el.$el
    else
      void nextTick(() => {
        target.value = document.querySelector<HTMLElement>(`[data-ui-group="${key}"]`)
      })
  }
}

/**
 * `hasSlot(name)` for use inside a `computed`. Classic components don't track `slots`, so a
 * computed that checks one would keep its first answer after the slot is added or removed;
 * this re-runs it when a re-render brings a change, and only then.
 */
export function useSlotPresence(slots: Slots): (name: string) => boolean {
  const seen = new Map<string, boolean>()
  const version = shallowRef(0)
  onBeforeUpdate(() => {
    for (const [name, had] of seen) {
      if (!!slots[name] === had) continue
      version.value++
      return
    }
  })
  return (name) => {
    void version.value
    const has = !!slots[name]
    seen.set(name, has)
    return has
  }
}

/**
 * Scrolls `container` so `el` is in view, honouring its `scroll-padding`. Unlike
 * `el.scrollIntoView()`, nothing outside `container` moves, so opening or arrowing through a
 * list never scrolls the page under it.
 */
export function scrollIntoContainer(
  container: HTMLElement,
  el: HTMLElement,
  align: 'nearest' | 'start' | 'end' | 'center' = 'nearest',
): void {
  const style = getComputedStyle(container)
  const padStart = parseFloat(style.scrollPaddingTop) || 0
  const padEnd = parseFloat(style.scrollPaddingBottom) || 0
  const box = container.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  const top = rect.top - box.top - container.clientTop + container.scrollTop
  const bottom = top + rect.height
  const view = container.clientHeight
  let next = container.scrollTop
  if (align === 'start') next = top - padStart
  else if (align === 'end') next = bottom + padEnd - view
  else if (align === 'center') next = top - (view - rect.height) / 2
  else if (top - padStart < next) next = top - padStart
  else if (bottom + padEnd > next + view) next = bottom + padEnd - view
  container.scrollTop = Math.max(0, next)
}

function rowGap(node: HTMLElement): number {
  return node.parentElement ? parseFloat(getComputedStyle(node.parentElement).columnGap) || 0 : 0
}

// Vue applies a leave's end state two frames after removal, which reads as a lag after a click.
// These start the leave on the same frame instead: commit the current size, then set the end
// state inline, and the element's leave-active transition carries it from there.
const LEAVE_STYLES = ['inline-size', 'padding-inline', 'margin-inline-end', 'opacity', 'transform']

/** Collapses a leaving chip where it is: no width, no padding, and the gap after it closed. */
export function collapseLeavingChip(el: Element): void {
  const node = el as HTMLElement
  node.style.inlineSize = `${node.getBoundingClientRect().width}px`
  void node.offsetWidth
  node.style.inlineSize = '0px'
  node.style.paddingInline = '0px'
  node.style.marginInlineEnd = `${-rowGap(node)}px`
  node.style.opacity = '0'
}

/** Undoes a leave started by these helpers, if Vue cancels it. */
export function resetLeaveStyles(el: Element): void {
  for (const prop of LEAVE_STYLES) (el as HTMLElement).style.removeProperty(prop)
}

/** Records how much room a clear button takes in its row, for the shared clear transition. */
export function measureClearSpace(el: Element): void {
  const node = el as HTMLElement
  const start = parseFloat(getComputedStyle(node).marginInlineStart) || 0
  node.style.setProperty('--ui-clear-space', `${node.offsetWidth + start + rowGap(node)}px`)
}

/** Starts a clear button's exit on the frame it's removed: fade, shrink, and slide its row across. */
export function startClearLeave(el: Element): void {
  const node = el as HTMLElement
  measureClearSpace(node)
  void node.offsetWidth
  node.style.opacity = '0'
  node.style.transform = 'scale(0.9)'
  node.style.marginInlineEnd = 'calc(var(--ui-clear-space) * -1)'
}
