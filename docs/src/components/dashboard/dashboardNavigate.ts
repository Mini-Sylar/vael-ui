import type { InjectionKey } from 'vue'

export type DashPage = 'overview' | 'orders' | 'customers'

export const dashboardNavigateKey: InjectionKey<(page: DashPage) => void> =
  Symbol('dashboard-navigate')
