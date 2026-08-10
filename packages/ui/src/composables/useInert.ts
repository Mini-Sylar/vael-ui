import type { MaybeRefOrGetter, WritableComputedRef } from 'vue'
import { computed, shallowRef, toValue, watch } from 'vue'
import { isClient, tryOnScopeDispose } from '@vueuse/core'

interface InertState {
  /** How many layers currently lock this element inert. */
  count: number
  /** Initial inert value. */
  initial: boolean
}

const inertStates = new WeakMap<HTMLElement, InertState>()

function retain(el: HTMLElement) {
  const state = inertStates.get(el)
  if (state) {
    state.count++
    return
  }
  inertStates.set(el, { count: 1, initial: el.inert })
  el.inert = true
}

function release(el: HTMLElement) {
  const state = inertStates.get(el)
  if (!state) return
  if (--state.count > 0) return

  inertStates.delete(el)
  el.inert = state.initial
}

/**
 * Every element that is *not* on the path from a content element up to `root` — i.e. the
 * siblings at each level, for every content element at once. Marking those inert propagates
 * to their subtrees, while each content element, its ancestors, and its own subtree stay
 * interactive. Supports more than one content element so independent regions (e.g. a target
 * element and a separately-teleported panel pointing at it) can be protected in one pass —
 * doing it as two separate single-content calls doesn't compose: each call's sibling-walk
 * would treat the *other* call's whole subtree as an unprotected sibling and inert it, and
 * since neither call's own path runs through the other's subtree, nothing ever un-inerts it.
 *
 * If none of the content elements live inside `root` (e.g. everything is teleported
 * elsewhere), nothing inside `root` needs to stay reachable, so the whole of it goes inert.
 */
function collectInertTargets(root: HTMLElement, contents: HTMLElement[]): HTMLElement[] {
  const insideContents = contents.filter((content) => root.contains(content))

  if (insideContents.length === 0) {
    const targets: HTMLElement[] = []
    for (const child of root.children) {
      if (child instanceof HTMLElement) targets.push(child)
    }
    return targets
  }

  // Every content element plus its ancestors up to (not including) root — these nodes' own
  // subtrees must never be inerted; only their *siblings* at each level are targets.
  const protectedNodes = new Set<HTMLElement>(insideContents)
  for (const content of insideContents) {
    let node: HTMLElement = content
    while (node !== root) {
      const parent = node.parentElement
      // necessary to prevent accidentally leaving the shadow root.
      if (!parent) break
      protectedNodes.add(parent)
      node = parent
    }
  }

  const targets = new Set<HTMLElement>()
  for (const node of protectedNodes) {
    if (node === root) continue
    const parent = node.parentElement
    if (!parent) continue
    for (const sibling of parent.children) {
      if (sibling !== node && sibling instanceof HTMLElement && !protectedNodes.has(sibling)) {
        targets.add(sibling)
      }
    }
  }

  return Array.from(targets)
}

export interface UseInertOptions {
  /**
   * Region to make inert. Defaults to `document.body`.
   */
  root?: MaybeRefOrGetter<HTMLElement | null>
  /**
   * The element(s) that stay interactive, along with their ancestors and subtrees. An array
   * protects all of them at once — see `collectInertTargets`'s doc comment for why that has to
   * happen in one call rather than one `useInert()` per element.
   */
  content: MaybeRefOrGetter<HTMLElement | null | (HTMLElement | null)[]>
  initial?: boolean
}

export type UseInertReturn = WritableComputedRef<boolean>

export function useInert(options: UseInertOptions): UseInertReturn {
  const { root, content, initial = false } = options

  const resolveRoot = (): HTMLElement | null => {
    if (root === undefined) return isClient ? document.body : null
    return toValue(root) ?? null
  }

  const resolveContents = (): HTMLElement[] => {
    const value = toValue(content)
    const list = Array.isArray(value) ? value : [value]
    return list.filter((el): el is HTMLElement => el != null)
  }

  const desired = shallowRef(initial)
  let held: HTMLElement[] = []

  const syncInert = () => {
    const rootEl = desired.value ? resolveRoot() : null
    const contentEls = desired.value ? resolveContents() : []

    const next = rootEl && contentEls.length > 0 ? collectInertTargets(rootEl, contentEls) : []

    // Retain the new set before releasing the old one
    for (const el of next) retain(el)
    for (const el of held) release(el)
    held = next
  }

  // `post` because both root and content are usually template refs, which are only
  // populated once the patch that created them has finished.
  watch([resolveRoot, resolveContents], syncInert, { flush: 'post' })

  tryOnScopeDispose(() => {
    desired.value = false
    syncInert()
  })

  if (initial) syncInert()

  return computed<boolean>({
    get: () => desired.value,
    set(v) {
      if (v === desired.value) return
      desired.value = v
      syncInert()
    },
  })
}
