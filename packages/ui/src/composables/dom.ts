import { isClient } from '@vueuse/core'

export type DOMTarget = HTMLElement | string | null

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

import { shallowRef, toValue, watch, type ShallowRef, type MaybeRefOrGetter } from 'vue'
import { tryOnMounted } from '@vueuse/core'

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
