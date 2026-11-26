// A part of a component that loads apart from it, once for the whole app: the inside of a panel,
// which is drawn only once it opens. The panel waits for it, so it never comes in empty.
import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'

/** @internal */
export interface LazyComponent<T> {
  /** Renders as it mounts once `ready`, not a tick later: through the loader the async wrapper keeps. */
  component: T
  /** True once loaded, or failed: a panel that never opened would be worse than one without it. */
  ready: ShallowRef<boolean>
  /** Starts loading; any number of calls load it once. */
  load: () => Promise<void>
}

// One per name in each build (vdom and Vapor have their own components), shared by every instance.
const parts = new Map<string, LazyComponent<unknown>>()

/**
 * @internal `create` makes the async wrapper, in the component's own file: `defineAsyncComponent`
 * there is Vapor's in the Vapor build. `name` keeps one per build; every instance gets the same one.
 */
export function lazyComponent<T>(name: string, create: () => T): LazyComponent<T> {
  const known = parts.get(name)
  if (known) return known as LazyComponent<T>
  const component = create() as T & {
    __asyncLoader: () => Promise<unknown>
    __asyncResolved?: unknown
  }
  const ready = shallowRef(!!component.__asyncResolved)
  let loading: Promise<void> | undefined
  const done = () => void (ready.value = true)
  const load = () => (loading ??= component.__asyncLoader().then(done, done))
  const part = { component, ready, load }
  parts.set(name, part as LazyComponent<unknown>)
  return part
}

/** @internal Starts loading them, as the component mounts: long before most first opens. */
export function preloadParts(...parts: LazyComponent<unknown>[]) {
  if (typeof window !== 'undefined') parts.forEach((part) => void part.load())
}
