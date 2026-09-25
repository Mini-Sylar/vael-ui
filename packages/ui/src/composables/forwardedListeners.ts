import { callWithAsyncErrorHandling, ErrorCodes, getCurrentInstance } from 'vue'

// A control calls a consumer's listener from its own handler for the same event instead of
// spreading it onto the element: Vapor re-binds spread listeners whenever another binding on that
// element changes, which drops them mid-dispatch on a real (trusted) event.
export function useForwardedListener(attrs: Record<string, unknown>) {
  const instance = getCurrentInstance()
  return (name: string, event: Event) => {
    const handler = attrs[name]
    if (typeof handler !== 'function' && !Array.isArray(handler)) return
    callWithAsyncErrorHandling(handler, instance, ErrorCodes.NATIVE_EVENT_HANDLER, [event])
  }
}

export function omitAttrs(attrs: Record<string, unknown>, keys: readonly string[]) {
  const rest: Record<string, unknown> = { ...attrs }
  for (const key of keys) delete rest[key]
  return rest
}
