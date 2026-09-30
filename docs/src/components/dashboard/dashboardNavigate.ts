import type { InjectionKey, Ref } from 'vue'

/** Two dashboards share one shell: a store, and a code repo. */
export type DashVariant = 'store' | 'repo'

export type DashPage = 'overview' | 'orders' | 'customers' | 'pulls' | 'files'

export const dashboardNavigateKey: InjectionKey<(page: DashPage) => void> =
  Symbol('dashboard-navigate')

/** The dashboard's own shell, so its overlays open inside it rather than over the page. */
export const dashboardShellKey: InjectionKey<Readonly<Ref<HTMLElement | null>>> =
  Symbol('dashboard-shell')
