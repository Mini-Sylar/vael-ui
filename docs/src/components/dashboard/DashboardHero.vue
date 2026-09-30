<template>
  <div ref="dashShell" class="dash-shell">
    <DashboardSidebar v-model:active-page="activePage" v-model:variant="variant" />

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
          <Menu :items="accountMenuItems" align="end" data-dash-overlay @select="onAccountSelect">
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
          <component :is="pages[activePage]" ref="page" :key="activePage" />
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
import { computed, provide, shallowRef, useTemplateRef, watch } from 'vue'
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
  PhFolder,
  PhGitPullRequest,
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
import RepoOverviewPage from './pages/RepoOverviewPage.vue'
import PullRequestsPage from './pages/PullRequestsPage.vue'
import FilesPage from './pages/FilesPage.vue'
import { customers } from './data'
import { repo } from './repoData'
import { dashboardNavigateKey, dashboardShellKey } from './dashboardNavigate'
import type { DashPage, DashVariant } from './dashboardNavigate'

const variant = defineModel<DashVariant>('variant', { default: 'store' })
const activePage = defineModel<DashPage>('activePage', { default: 'overview' })
watch(variant, () => (activePage.value = 'overview'))

const pages = computed<Partial<Record<DashPage, unknown>>>(() =>
  variant.value === 'repo'
    ? { overview: RepoOverviewPage, pulls: PullRequestsPage, files: FilesPage }
    : { overview: OverviewPage, orders: OrdersPage, customers: CustomersPage },
)
const pageTitles: Record<DashPage, string> = {
  overview: 'Overview',
  orders: 'Orders',
  customers: 'Customers',
  pulls: 'Pull requests',
  files: 'Files',
}
const pageTitle = computed(() => pageTitles[activePage.value])

provide(dashboardNavigateKey, (page: DashPage) => (activePage.value = page))

const dashShell = useTemplateRef<HTMLElement>('dashShell')
provide(dashboardShellKey, dashShell)

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

const repoPaletteItems = computed<DashboardCommand[]>(() => [
  {
    id: 'nav-overview',
    label: 'Overview',
    group: 'Navigate',
    icon: PhSquaresFour,
    kind: 'nav',
    page: 'overview',
  },
  {
    id: 'nav-pulls',
    label: 'Pull requests',
    group: 'Navigate',
    icon: PhGitPullRequest,
    kind: 'nav',
    page: 'pulls',
  },
  {
    id: 'nav-files',
    label: 'Files',
    group: 'Navigate',
    icon: PhFolder,
    kind: 'nav',
    page: 'files',
  },
  { id: 'action-tour', label: 'Take a tour', group: 'Actions', icon: PhCompass, kind: 'action' },
  ...repo.pulls
    .filter((p) => p.state === 'open')
    .map((p): DashboardCommand => ({
      id: `pull-${p.id}`,
      label: p.title,
      description: `#${p.id}`,
      group: 'Pull requests',
      icon: PhGitPullRequest,
      kind: 'nav',
      page: 'pulls',
    })),
])

const paletteItems = computed<DashboardCommand[]>(() =>
  variant.value === 'repo' ? repoPaletteItems.value : storePaletteItems.value,
)

const storePaletteItems = computed<DashboardCommand[]>(() => [
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

const tourSteps = computed<TourStep[]>(() => [
  {
    target: '#dash-nav',
    title: 'Your workspace',
    description:
      variant.value === 'repo'
        ? 'Jump between Overview, Pull requests, and Files from here.'
        : 'Jump between Overview, Orders, and Customers from here.',
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
  variant.value === 'repo'
    ? {
        target: '#dash-activity',
        title: 'Recent activity',
        description: 'Merges, reviews and deploys land here the moment they happen.',
        side: 'left',
        onBeforeEnter: async () => {
          if (activePage.value !== 'overview') activePage.value = 'overview'
          await waitForElement('#dash-activity')
        },
      }
    : {
        target: '#dash-view-all-link',
        title: 'Recent activity',
        description: 'Every new order lands on this list — click through for the full history.',
        side: 'bottom',
        onBeforeEnter: async () => {
          if (activePage.value !== 'overview') activePage.value = 'overview'
          await waitForElement('#dash-view-all-link')
        },
      },
])

const page = useTemplateRef<{ reset?: () => void }>('page')
defineExpose({
  /** Resets the current page's own state (a pinned chart day, an open file). */
  resetPage: () => page.value?.reset?.(),
})
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

/* Windows draws every scrollbar solid and always on. Inside the demo's
   widgets (palette, tree, tables, code) they'd be noise the fades already
   cover; the main area keeps a thin, quiet one so it still reads as scrollable. */
.dash-shell :deep(*) {
  scrollbar-width: none;
}
.dash-shell .dash-content {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklch, var(--ui-text) 18%, transparent) transparent;
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
