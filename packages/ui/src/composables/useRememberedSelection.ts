import { computed, watchEffect } from 'vue'
import type { ComputedRef } from 'vue'

type Value = string | number

/**
 * The selected items: from `options` when they're in it, else as they were when last seen there.
 * A remote search replaces `items` with each response, and a choice missing from it keeps its label
 * and chip instead of reading as cleared. A value that was never in `options` stays unresolved.
 */
export function useRememberedSelection<T extends { value: Value }>(
  options: () => readonly T[],
  selected: () => ReadonlySet<Value>,
): ComputedRef<T[]> {
  const seen = new Map<Value, T>()
  // Remembers on every change, read or not: a single Combobox only asks once the item is gone.
  watchEffect(
    () => {
      const values = selected()
      // Nothing chosen, nothing to remember: the options aren't read (or built) at all.
      if (!values.size) return seen.clear()
      for (const item of options()) if (values.has(item.value)) seen.set(item.value, item)
      for (const value of seen.keys()) if (!values.has(value)) seen.delete(value)
    },
    { flush: 'sync' },
  )
  return computed(() => {
    const values = selected()
    const found = options().filter((item) => values.has(item.value))
    const shown = new Set(found.map((item) => item.value))
    const kept: T[] = []
    for (const value of values) {
      const item = seen.get(value)
      if (item && !shown.has(value)) kept.push(item)
    }
    return kept.length ? [...found, ...kept] : found
  })
}
