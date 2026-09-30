import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { dashboardShellKey } from './dashboardNavigate'

/**
 * DataTable's `stackedBreakpoint` is a viewport media query, but this
 * dashboard is often narrow on a wide screen. Measure the dashboard itself and
 * hand back a breakpoint any viewport matches once it's narrower than `below`.
 */
export function useDashStacked(below: number): ComputedRef<string | undefined> {
  const shell = inject(dashboardShellKey, undefined)
  const { width } = useElementSize(() => shell?.value ?? null)
  return computed(() => (width.value > 0 && width.value < below ? '100000px' : undefined))
}
