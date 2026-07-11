import { createRouter, createMemoryHistory } from 'vue-router'
import OverviewPage from './pages/OverviewPage.vue'
import OrdersPage from './pages/OrdersPage.vue'
import CustomersPage from './pages/CustomersPage.vue'
import SettingsPage from './pages/SettingsPage.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title: string
  }
}

// createMemoryHistory + app-wide install keeps ConfigProvider/i18n scoped to dashboard
export const dashboardRouter = createRouter({
  history: createMemoryHistory('/dashboard/'),
  routes: [
    { path: '/', redirect: '/overview' },
    {
      path: '/overview',
      name: 'overview',
      component: OverviewPage,
      meta: { title: 'Overview' },
    },
    {
      path: '/orders',
      name: 'orders',
      component: OrdersPage,
      meta: { title: 'Orders' },
    },
    {
      path: '/customers',
      name: 'customers',
      component: CustomersPage,
      meta: { title: 'Customers' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage,
      meta: { title: 'Settings' },
    },
  ],
})
