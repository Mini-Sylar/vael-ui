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
 * Every element between `content` and `root` that is *not* on the path from one to the
 * other — i.e. the siblings at each level. Marking those inert propagates to their
 * subtrees, while `content` and its ancestors stay interactive.
 *
 * If `content` lives outside `root` (a panel teleported elsewhere), nothing inside
 * `root` needs to stay reachable, so the whole of it goes inert.
 */
function collectInertTargets(root: HTMLElement, content: HTMLElement): HTMLElement[] {
  const targets: HTMLElement[] = []

  if (!root.contains(content)) {
    for (const child of root.children) {
      if (child instanceof HTMLElement) targets.push(child)
    }
    return targets
  }

  let node: HTMLElement = content
  while (node !== root) {
    const parent = node.parentElement
    // necessary to prevent accidentally leaving the shadow root.
    if (!parent) break
    for (const sibling of parent.children) {
      if (sibling !== node && sibling instanceof HTMLElement) targets.push(sibling)
    }
    node = parent
  }

  return targets
}

export interface UseInertOptions {
  /**
   * Region to make inert. Defaults to `document.body`.
   */
  root?: MaybeRefOrGetter<HTMLElement | null>
  /** The element that stays interactive, along with its ancestors and subtree. */
  content: MaybeRefOrGetter<HTMLElement | null>
  initial?: boolean
}

export type UseInertReturn = WritableComputedRef<boolean>

export function useInert(options: UseInertOptions): UseInertReturn {
  const { root, content, initial = false } = options

  const resolveRoot = (): HTMLElement | null => {
    if (root === undefined) return isClient ? document.body : null
    return toValue(root) ?? null
  }

  const desired = shallowRef(initial)
  let held: HTMLElement[] = []

  const syncInert = () => {
    const rootEl = desired.value ? resolveRoot() : null
    const contentEl = desired.value ? (toValue(content) ?? null) : null

    const next = rootEl && contentEl ? collectInertTargets(rootEl, contentEl) : []

    // Retain the new set before releasing the old one
    for (const el of next) retain(el)
    for (const el of held) release(el)
    held = next
  }

  // `post` because both root and content are usually template refs, which are only
  // populated once the patch that created them has finished.
  watch([resolveRoot, () => toValue(content)], syncInert, { flush: 'post' })

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
