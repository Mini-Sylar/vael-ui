import type { MaybeRefOrGetter, WritableComputedRef } from 'vue'
import { computed, shallowRef, toValue, watch } from 'vue'
import { isClient, isIOS, tryOnScopeDispose, useEventListener } from '@vueuse/core'

export const ScrollbarWidthVariable = '--ui-scrollbar-width'

/** Overwritten inline style. */
interface StylePatch {
  el: HTMLElement
  prop: string
  /** Inline value before patch - `''` when there was none. */
  value: string
  priority: string
  /** Inline value after patch. Used to detect external modifications. */
  applied: string
}

interface LockState {
  holders: Set<symbol>
  patches: StylePatch[]
  /** Element carrying `--ui-scrollbar-width`, or null if never set. */
  varHolder: HTMLElement | null
  stopTouchMove?: () => void
}

const locks = new WeakMap<HTMLElement, LockState>()

export interface UseScrollLockOptions {
  /**
   * Element to lock. Defaults to `document.body`.
   */
  target?: MaybeRefOrGetter<HTMLElement | null>
  initial?: boolean
}

export type UseScrollLockReturn = WritableComputedRef<boolean>

export function useScrollLock(options: UseScrollLockOptions = {}): UseScrollLockReturn {
  const { target, initial = false } = options

  // Lazy so `document` is never touched during SSR.
  const resolveTarget = (): HTMLElement | null => {
    if (target === undefined) return isClient ? document.body : null
    return toValue(target) ?? null
  }

  const desired = shallowRef(initial)
  let held: HTMLElement | null = null
  let release: (() => void) | null = null

  const syncLock = () => {
    const next = desired.value ? resolveTarget() : null
    if (next === held) return

    // before locking the new element, release the previous one:
    release?.()
    held = next
    release = next ? acquireLock(next) : null
  }

  watch(resolveTarget, syncLock, { flush: 'sync' })
  tryOnScopeDispose(() => {
    desired.value = false
    syncLock()
  })

  if (initial) syncLock()

  return computed<boolean>({
    get: () => desired.value,
    set(v) {
      if (v === desired.value) return
      desired.value = v
      syncLock()
    },
  })
}

function patchStyle(state: LockState, el: HTMLElement, prop: string, applied: string) {
  state.patches.push({
    el,
    prop,
    value: el.style.getPropertyValue(prop),
    priority: el.style.getPropertyPriority(prop),
    applied,
  })
  el.style.setProperty(prop, applied)
}

function acquireLock(element: HTMLElement): () => void {
  const holder = Symbol('holder')

  const existing = locks.get(element)
  if (existing) {
    existing.holders.add(holder)
    return () => releaseLock(element, holder)
  }

  const isBody = element === document.body
  const computedStyles = getComputedStyle(element)

  const scrollbarWidth = isBody
    ? window.innerWidth - document.documentElement.clientWidth
    : element.offsetWidth -
      element.clientWidth -
      (Number.parseFloat(computedStyles.borderInlineStartWidth) || 0) -
      (Number.parseFloat(computedStyles.borderInlineEndWidth) || 0)

  const state: LockState = {
    holders: new Set([holder]),
    patches: [],
    varHolder: null,
  }
  locks.set(element, state)

  patchStyle(state, element, 'overflow', 'hidden')
  patchStyle(state, element, 'overscroll-behavior', 'contain')

  if (scrollbarWidth > 0) {
    const existing = Number.parseFloat(computedStyles.paddingInlineEnd) || 0
    patchStyle(state, element, 'padding-inline-end', `${existing + scrollbarWidth}px`)

    state.varHolder = isBody ? document.documentElement : element
    state.varHolder.style.setProperty(ScrollbarWidthVariable, `${scrollbarWidth}px`)
  }

  if (isBody && isIOS) {
    state.stopTouchMove = useEventListener(
      document,
      'touchmove',
      (e: TouchEvent) => {
        if (e.touches.length > 1) return
        // don't block a genuinely scrollable region inside the locked element:
        if (e.target instanceof Element && checkOverflowScroll(e.target, element)) return
        if (e.cancelable) e.preventDefault()
      },
      { passive: false },
    )
  }

  return () => releaseLock(element, holder)
}

function releaseLock(element: HTMLElement, holder: symbol) {
  const state = locks.get(element)
  // if already released or never held -> no-op
  if (!state || !state.holders.delete(holder)) return
  // if something still holds the lock -> no-op
  if (state.holders.size > 0) return

  locks.delete(element)
  state.stopTouchMove?.()

  state.varHolder?.style.removeProperty(ScrollbarWidthVariable)

  for (const p of state.patches) {
    // if something modified us while locked, give it a priority
    if (p.el.style.getPropertyValue(p.prop) !== p.applied) continue
    if (p.value) p.el.style.setProperty(p.prop, p.value, p.priority)
    else p.el.style.removeProperty(p.prop)
  }
}

// modified from: https://github.com/vueuse/vueuse/blob/main/packages/core/useScrollLock/index.ts
// the reference has a bug, where if `document.body` is passed, parentNode will traverse until <html> tag
function checkOverflowScroll(ele: Element, terminator: HTMLElement): boolean {
  for (let el: Element | null = ele; el && el !== terminator; el = el.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(el)
    if (overflowY === 'scroll' || (overflowY === 'auto' && el.clientHeight < el.scrollHeight)) {
      return true
    }
    if (overflowX === 'scroll' || (overflowX === 'auto' && el.clientWidth < el.scrollWidth)) {
      return true
    }
  }
  return false
}
