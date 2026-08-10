<template>
  <div ref="dashShell" class="dash-shell">
    <DashboardSidebar v-model:active-page="activePage" />

    <div class="dash-main">
      <header class="dash-header">
        <div class="dash-header-titles">
          <Breadcrumb :items="breadcrumbItems" class="dash-crumb" />
          <h1 class="dash-title">{{ pageTitle }}</h1>
        </div>

        <div class="dash-header-actions">
          <Input
            id="dash-search-trigger"
            readonly
            placeholder="Search or jump to…"
            class="dash-search"
            @click="paletteOpen = true"
          >
            <template #start>
              <PhMagnifyingGlass :size="16" />
            </template>
            <template #end>
              <Kbd class="dash-search-kbd">⌘K</Kbd>
            </template>
          </Input>
          <Button
            id="dash-tour-trigger"
            variant="ghost"
            icon
            pill
            aria-label="Take a tour"
            v-tooltip="'Take a tour'"
            @click="tourOpen = true"
          >
            <PhQuestion :size="18" />
          </Button>
          <Button
            id="dash-notifications-btn"
            variant="ghost"
            icon
            pill
            aria-label="Notifications"
            v-tooltip="'Notifications'"
          >
            <PhBell :size="18" />
          </Button>
          <Menu :items="accountMenuItems" align="end" @select="onAccountSelect">
            <template #trigger>
              <Button id="dash-account-trigger" variant="ghost" icon pill aria-label="Account menu">
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

    <CommandPalette
      v-model:open="paletteOpen"
      shortcut="mod+k"
      placeholder="Search or jump to…"
      :items="paletteItems"
      :container="dashShell"
      @select="onPaletteSelect"
    />
    <Tour v-model:open="tourOpen" :steps="tourSteps" :container="dashShell" />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, shallowRef, useTemplateRef } from 'vue'
import {
  Avatar,
  Breadcrumb,
  Button,
  CommandPalette,
  Input,
  Kbd,
  Menu,
  Tour,
  toast,
  vTooltip,
} from 'vael-ui'
import type { BreadcrumbItemData, CommandPaletteItem, MenuItemData, TourStep } from 'vael-ui'
import {
  PhBell,
  PhCompass,
  PhMagnifyingGlass,
  PhPackage,
  PhQuestion,
  PhSignOut,
  PhSquaresFour,
  PhUserCircle,
  PhUsers,
} from '@phosphor-icons/vue'
import Logo from '../Logo.vue'
import DashboardSidebar from './DashboardSidebar.vue'
import OverviewPage from './pages/OverviewPage.vue'
import OrdersPage from './pages/OrdersPage.vue'
import CustomersPage from './pages/CustomersPage.vue'
import { customers } from './data'
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

const dashShell = useTemplateRef<HTMLElement>('dashShell')

const breadcrumbItems = computed<BreadcrumbItemData[]>(() => [
  {
    label: 'Home',
    icon: Logo,
    as: 'button',
    attrs: { type: 'button', onClick: () => (activePage.value = 'overview') },
  },
  { label: pageTitle.value, current: true },
])

const accountMenuItems: MenuItemData[] = [
  { label: 'Profile', value: 'profile' },
  { label: 'Billing', value: 'billing' },
  { label: 'Sign out', value: 'signout', danger: true },
]
function onAccountSelect(item: MenuItemData) {
  toast(`"${item.label}" isn't wired to a real action in this showcase.`)
}

const paletteOpen = shallowRef(false)

interface DashboardCommand extends CommandPaletteItem {
  kind: 'nav' | 'action' | 'customer'
  page?: DashPage
}

const paletteItems = computed<DashboardCommand[]>(() => [
  {
    id: 'nav-overview',
    label: 'Overview',
    group: 'Navigate',
    icon: PhSquaresFour,
    kind: 'nav',
    page: 'overview',
  },
  {
    id: 'nav-orders',
    label: 'Orders',
    group: 'Navigate',
    icon: PhPackage,
    kind: 'nav',
    page: 'orders',
  },
  {
    id: 'nav-customers',
    label: 'Customers',
    group: 'Navigate',
    icon: PhUsers,
    kind: 'nav',
    page: 'customers',
  },
  { id: 'action-tour', label: 'Take a tour', group: 'Actions', icon: PhCompass, kind: 'action' },
  { id: 'action-signout', label: 'Sign out', group: 'Actions', icon: PhSignOut, kind: 'action' },
  ...customers.slice(0, 6).map((c): DashboardCommand => ({
    id: `customer-${c.id}`,
    label: c.name,
    description: c.email,
    group: 'Customers',
    icon: PhUserCircle,
    kind: 'customer',
  })),
])

function onPaletteSelect(item: DashboardCommand) {
  if (item.kind === 'nav' && item.page) {
    activePage.value = item.page
    return
  }
  if (item.kind === 'customer') {
    activePage.value = 'customers'
    toast(`Opening ${item.label}'s profile isn't wired in this showcase.`)
    return
  }
  if (item.id === 'action-tour') {
    tourOpen.value = true
    return
  }
  if (item.id === 'action-signout') {
    toast('Signed out (nothing actually happens in this demo).')
  }
}

const tourOpen = shallowRef(false)

async function waitForElement(selector: string, timeoutMs = 1000): Promise<void> {
  const start = Date.now()
  while (!document.querySelector(selector)) {
    if (Date.now() - start > timeoutMs) return
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
}

const tourSteps: TourStep[] = [
  {
    target: '#dash-nav',
    title: 'Your workspace',
    description: 'Jump between Overview, Orders, and Customers from here.',
    side: 'right',
  },
  {
    target: '#dash-search-trigger',
    title: 'Search or jump to anything',
    description: 'Press ⌘K (or Ctrl+K) from anywhere in the dashboard to open this instantly.',
    side: 'bottom',
  },
  {
    target: '#dash-notifications-btn',
    title: 'Notifications',
    description: 'Anything that needs your attention shows up here.',
    side: 'bottom',
  },
  {
    target: '#dash-account-trigger',
    title: 'Your account',
    description: 'Profile, billing, and signing out all live in this menu.',
    side: 'bottom',
    align: 'end',
  },
  {
    target: '#dash-view-all-link',
    title: 'Recent activity',
    description: 'Every new order lands on this list — click through for the full history.',
    side: 'bottom',
    onBeforeEnter: async () => {
      if (activePage.value !== 'overview') activePage.value = 'overview'
      await waitForElement('#dash-view-all-link')
    },
  },
]
</script>

<style scoped>
.dash-shell {
  position: relative;
  display: flex;
  align-items: stretch;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
  background: var(--ui-surface);
  box-shadow: var(--ui-panel-shadow);
  block-size: 100%;
}

/* Named container — the space actually left AFTER the sidebar (not the shell's
   total width, which the sidebar eats into) drives the @container queries
   below, and OverviewPage.vue's own. */
.dash-main {
  container-type: inline-size;
  container-name: dash-main;
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
  min-inline-size: 0;
  overflow: hidden;
}

.dash-crumb {
  min-inline-size: 0;
  overflow: hidden;
}
.dash-crumb :deep(.ui-breadcrumb-list) {
  font-size: 0.75rem;
  gap: 0.375rem;
  flex-wrap: nowrap;
  overflow: hidden;
}

.dash-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dash-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.dash-search {
  inline-size: 15rem;
  cursor: pointer;
  transition: transform var(--ui-duration-press) var(--ui-ease-out);
}
.dash-search:active {
  transform: scale(0.99);
}
.dash-search-kbd {
  font-size: 0.6875rem;
}

.dash-content {
  flex: 1 1 auto;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
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

/* Shrinks to icon-only rather than `display: none` — a hidden target has no
   layout box, and Tour's own step 2 points right at this element. */
@container dash-main (max-width: 36rem) {
  .dash-search {
    inline-size: 2.25rem;
    padding-inline: 0;
    position: relative;
  }
  .dash-search :deep(.ui-input-start) {
    position: absolute;
    inset: 0;
    justify-content: center;
    pointer-events: none;
  }
  .dash-search :deep(.ui-input-end) {
    display: none;
  }
  .dash-search :deep(.ui-input-el)::placeholder {
    color: transparent;
  }
}
</style>
