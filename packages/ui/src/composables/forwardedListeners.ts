import {
  callWithAsyncErrorHandling,
  computed,
  ErrorCodes,
  getCurrentInstance,
  watchEffect,
} from 'vue'
import type { ComputedRef } from 'vue'

// A control calls a consumer's listener from its own handler for the same event instead of
// spreading it onto the element: Vapor re-binds spread listeners whenever another binding on that
// element changes, which drops them mid-dispatch on a real (trusted) event.
/** @internal Not public API; used by vael-ui's own components and may change. */
export function useForwardedListener(attrs: Record<string, unknown>) {
  const instance = getCurrentInstance()
  return (name: string, event: Event) => {
    const handler = attrs[name]
    if (typeof handler !== 'function' && !Array.isArray(handler)) return
    callWithAsyncErrorHandling(handler, instance, ErrorCodes.NATIVE_EVENT_HANDLER, [event])
  }
}

/** @internal Not public API; used by vael-ui's own components and may change. */
export function omitAttrs(attrs: Record<string, unknown>, keys: readonly string[]) {
  const rest: Record<string, unknown> = { ...attrs }
  for (const key of keys) delete rest[key]
  return rest
}

// Wrapper-rooted controls send `id` and `aria-*` to the inner input, where a label can name it.
export function useControlAttrs(attrs: Record<string, unknown>) {
  const isControlAttr = (key: string) => key === 'id' || key.startsWith('aria-')
  const pick = (control: boolean) =>
    computed(() =>
      Object.fromEntries(Object.entries(attrs).filter(([key]) => isControlAttr(key) === control)),
    )
  return { rootAttrs: pick(false), inputAttrs: pick(true) }
}

const LISTENER = /^on[A-Z]/
const OPTION_MODIFIER = /(?:Once|Passive|Capture)$/

// Same split Vue's runtime-dom does: `onKeydownCapture` is `keydown` with `{ capture: true }`.
function parseListener(key: string): [string, AddEventListenerOptions | undefined] {
  let name = key
  let options: AddEventListenerOptions | undefined
  let match: RegExpMatchArray | null
  while ((match = name.match(OPTION_MODIFIER))) {
    name = name.slice(0, -match[0].length)
    ;(options ??= {})[match[0].toLowerCase() as 'once' | 'passive' | 'capture'] = true
  }
  const event =
    name[2] === ':'
      ? name.slice(3)
      : name
          .slice(2)
          .replace(/\B([A-Z])/g, '-$1')
          .toLowerCase()
  return [event, options]
}

/**
 * The consumer's attrs for a panel that closes, minus its `on*` listeners, which go on the
 * element natively instead. Vapor drops spread listeners as soon as an element starts leaving,
 * so the event that closed a panel (Escape, an option click) never reached the consumer's own
 * `@keydown` or `@click` on it. Spread the returned attrs as before.
 */
export function useAttrListeners(
  target: () => Element | null | undefined,
  source: () => Record<string, unknown>,
): ComputedRef<Record<string, unknown>> {
  const instance = getCurrentInstance()
  const split = computed(() => {
    const rest: Record<string, unknown> = {}
    const listeners: string[] = []
    const attrs = source()
    for (const key in attrs) {
      if (LISTENER.test(key)) listeners.push(key)
      else rest[key] = attrs[key]
    }
    return { rest, listeners }
  })
  // One native listener per event per element, calling whatever handler is current. A closed
  // panel's element is dropped, and its listeners with it.
  const attached = new WeakMap<Element, Set<string>>()
  watchEffect(
    () => {
      const el = target()
      if (!el) return
      let keys = attached.get(el)
      if (!keys) attached.set(el, (keys = new Set()))
      for (const key of split.value.listeners) {
        if (keys.has(key)) continue
        keys.add(key)
        const [event, options] = parseListener(key)
        el.addEventListener(
          event,
          (e) => {
            const handler = source()[key]
            if (typeof handler !== 'function' && !Array.isArray(handler)) return
            callWithAsyncErrorHandling(handler, instance, ErrorCodes.NATIVE_EVENT_HANDLER, [e])
          },
          options,
        )
      }
    },
    { flush: 'post' },
  )
  return computed(() => split.value.rest)
}
