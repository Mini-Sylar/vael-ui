// `useEventListener(() => window, ...)` still crashes during SSR: vueuse
// evaluates a caller-supplied target getter immediately to resolve its
// initial value, and the bare `window` identifier throws just by being
// referenced in Node, getter or not. These return `undefined` server-side
// instead, which vueuse treats as "no target yet" and skips attaching.
/** `window`, or `undefined` when running server-side. Pass directly as a `useEventListener` target getter — never pass bare `window`, which throws in Node before the SSR check would even run. */
export const ssrWindow = (): Window | undefined =>
  typeof window === 'undefined' ? undefined : window
/** `document`, or `undefined` when running server-side. Same contract as `ssrWindow`. */
export const ssrDocument = (): Document | undefined =>
  typeof document === 'undefined' ? undefined : document
