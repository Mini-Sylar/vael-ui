<template>
  <div class="dash-shell">
    <DashboardSidebar v-model:active-page="activePage" />

    <div class="dash-main">
      <header class="dash-header">
        <div class="dash-header-titles">
          <nav aria-label="Breadcrumb" class="dash-crumb">
            <ol class="dash-crumb-trail">
              <li class="dash-crumb-item">
                <Button variant="ghost" size="sm" class="dash-crumb-link">
                  <Logo :size="14" class="dash-crumb-logo" />
                  Home
                </Button>
                <PhCaretRight :size="12" class="dash-crumb-separator" />
              </li>
              <li class="dash-crumb-item">
                <span class="dash-crumb-current" aria-current="page">{{ pageTitle }}</span>
              </li>
            </ol>
          </nav>
          <h1 class="dash-title">{{ pageTitle }}</h1>
        </div>

        <div class="dash-header-actions">
          <Input v-model="globalSearch" placeholder="Search orders, customers…" class="dash-search">
            <template #start>
              <PhMagnifyingGlass :size="16" />
            </template>
          </Input>
          <Button variant="ghost" icon pill aria-label="Notifications" v-tooltip="'Notifications'">
            <PhBell :size="18" />
          </Button>
          <Menu :items="accountMenuItems" align="end" @select="onAccountSelect">
            <template #trigger>
              <Button variant="ghost" icon pill aria-label="Account menu">
                <Avatar name="Mira Mitchell" size="sm" />
              </Button>
            </template>
          </Menu>
        </div>
      </header>

      <div class="dash-content">
        <Transition name="fade" mode="out-in">
          <component :is="pages[activePage]" :key="activePage" />
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, shallowRef } from 'vue'
import { Avatar, Button, Input, Menu, toast, vTooltip } from 'vael-ui'
import type { MenuItemData } from 'vael-ui'
import { PhBell, PhCaretRight, PhMagnifyingGlass } from '@phosphor-icons/vue'
import Logo from '../Logo.vue'
import DashboardSidebar from './DashboardSidebar.vue'
import OverviewPage from './pages/OverviewPage.vue'
import OrdersPage from './pages/OrdersPage.vue'
import CustomersPage from './pages/CustomersPage.vue'
import { dashboardNavigateKey } from './dashboardNavigate'
import type { DashPage } from './dashboardNavigate'

const activePage = defineModel<DashPage>('activePage', { default: 'overview' })

const pages: Record<DashPage, unknown> = {
  overview: OverviewPage,
  orders: OrdersPage,
  customers: CustomersPage,
}
const pageTitles: Record<DashPage, string> = {
  overview: 'Overview',
  orders: 'Orders',
  customers: 'Customers',
}
const pageTitle = computed(() => pageTitles[activePage.value])

provide(dashboardNavigateKey, (page: DashPage) => (activePage.value = page))

const globalSearch = shallowRef('')

const accountMenuItems: MenuItemData[] = [
  { label: 'Profile', value: 'profile' },
  { label: 'Billing', value: 'billing' },
  { label: 'Sign out', value: 'signout', danger: true },
]
function onAccountSelect(item: MenuItemData) {
  toast(`"${item.label}" isn't wired to a real action in this showcase.`)
}
</script>

<style scoped>
.dash-shell {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
  background: var(--ui-surface);
  box-shadow: var(--ui-panel-shadow);
  block-size: 100%;
}

.dash-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  border-block-end: 1px solid var(--ui-border);
}

.dash-header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.dash-crumb-trail {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}

.dash-crumb-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.dash-crumb-link {
  padding-inline: 0.375rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.dash-crumb-link:hover {
  color: var(--ui-text);
}

.dash-crumb-current {
  padding-inline: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-text);
}

.dash-crumb-separator {
  color: var(--ui-text-muted);
  opacity: 0.6;
}

.dash-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.dash-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dash-search {
  inline-size: 15rem;
}

.dash-content {
  flex: 1 1 auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-inline-size: 0;
  overflow: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .dash-search {
    display: none;
  }
}
</style>
