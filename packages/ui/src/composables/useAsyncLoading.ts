import { computed, shallowRef } from 'vue'
import type { ComputedRef } from 'vue'

export interface UseAsyncLoadingReturn {
  loading: ComputedRef<boolean>
  run: <T>(fn: () => T | Promise<T>) => Promise<T>
}

// Tracks all in-flight promises; loading stays true until all settle.
export function useAsyncLoading(): UseAsyncLoadingReturn {
  const pending = shallowRef(0)
  const loading = computed(() => pending.value > 0)

  async function run<T>(fn: () => T | Promise<T>): Promise<T> {
    pending.value++
    try {
      return await fn()
    } finally {
      pending.value--
    }
  }

  return { loading, run }
}
