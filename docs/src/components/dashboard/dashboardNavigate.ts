import type { InjectionKey } from 'vue'

/** Two dashboards share one shell: a store, and a code repo. */
export type DashVariant = 'store' | 'repo'

export type DashPage = 'overview' | 'orders' | 'customers' | 'pulls' | 'files'

export const dashboardNavigateKey: InjectionKey<(page: DashPage) => void> =
  Symbol('dashboard-navigate')
