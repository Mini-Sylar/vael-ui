<template>
  <section class="demo dashboard-demo">
    <h2>Dashboard shell — a diagnostic build</h2>
    <p class="note">
      A full admin dashboard, split across its own
      <code>demos/dashboard/</code> folder and driven by a real <code>vue-router</code> instance
      (<code>createMemoryHistory</code> — scoped to this subtree, never touches the browser address
      bar). Sidebar nav uses <code>MenuList</code> + <code>Collapsible</code> (replacing the earlier
      hand-rolled <code>useCollapse</code> pair), the Orders/Customers tables use
      <code>DataTable</code>'s built-in <code>selectable</code> and <code>stackedBreakpoint</code>,
      and the Overview page's stat cards stagger in via real <code>motion-v</code> — proving the
      library's animation-agnostic contract needs no library changes to support consumer-owned
      motion.
    </p>

    <div class="dash-bleed">
      <div class="dash-shell">
        <DashboardSidebar />

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
                  <Button
                    id="dash-account-trigger"
                    variant="ghost"
                    icon
                    pill
                    aria-label="Account menu"
                  >
                    <Avatar name="Ama Mensah" size="sm" />
                  </Button>
                </template>
              </Menu>
            </div>
          </header>

          <div class="dash-content">
            <RouterView>
              <template #default="{ Component, route }">
                <Transition name="fade" mode="out-in" appear>
                  <component :is="Component" :key="route.name" />
                </Transition>
              </template>
            </RouterView>
          </div>
        </div>
      </div>
    </div>

    <CommandPalette
      v-model:open="paletteOpen"
      shortcut="mod+k"
      placeholder="Search or jump to…"
      :items="paletteItems"
      @select="onPaletteSelect"
    />
    <Tour v-model:open="tourOpen" :steps="tourSteps" />
  </section>
</template>

<!--
  This file owns only the shell (sidebar + topbar + <router-view>) and the
  global search input (a plain ref — no page reads it yet, kept as a real,
  visible affordance rather than a decorative placeholder; a real app would
  route it into whichever page's own search/filter state is active). Every
  page's own content lives in ./pages/*.vue, one per route — see router.ts.

  Comment stays outside <template> — see Button.vue for why.
-->
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  PhGear,
  PhMagnifyingGlass,
  PhPackage,
  PhQuestion,
  PhSignOut,
  PhSquaresFour,
  PhUserCircle,
  PhUsers,
} from '@phosphor-icons/vue'
import DashboardSidebar from './DashboardSidebar.vue'
import { customers } from './data'

const route = useRoute()
const router = useRouter()
const pageTitle = computed(() => (route.meta.title as string | undefined) ?? 'Dashboard')

const accountMenuItems: MenuItemData[] = [
  { label: 'Profile', value: '/settings?tab=general' },
  { label: 'Billing', value: '/settings?tab=billing' },
  { label: 'Sign out', value: 'signout', danger: true },
]
function onAccountSelect(item: MenuItemData) {
  if (item.value === 'signout') {
    toast('Signed out (nothing actually happens in this demo).')
    return
  }
  if (item.value) void router.push(String(item.value))
}

const SETTINGS_TAB_LABELS: Record<string, string> = {
  general: 'General',
  notifications: 'Notifications',
  security: 'Security',
  billing: 'Billing',
}

const breadcrumbItems = computed<BreadcrumbItemData[]>(() => {
  const items: BreadcrumbItemData[] = [
    { label: 'Home', as: 'RouterLink', attrs: { to: '/overview' } },
  ]
  const tab = route.query.tab
  const tabLabel = typeof tab === 'string' ? SETTINGS_TAB_LABELS[tab] : undefined
  if (route.name === 'settings' && tabLabel) {
    items.push({ label: 'Settings', as: 'RouterLink', attrs: { to: '/settings' } })
    items.push({ label: tabLabel, current: true })
  } else {
    items.push({ label: pageTitle.value, current: true })
  }
  return items
})

// Command palette
const paletteOpen = shallowRef(false)

interface DashboardCommand extends CommandPaletteItem {
  kind: 'nav' | 'action' | 'customer'
  to?: string
}

const paletteItems = computed<DashboardCommand[]>(() => [
  {
    id: 'nav-overview',
    label: 'Overview',
    group: 'Navigate',
    icon: PhSquaresFour,
    kind: 'nav',
    to: '/overview',
  },
  {
    id: 'nav-orders',
    label: 'Orders',
    group: 'Navigate',
    icon: PhPackage,
    kind: 'nav',
    to: '/orders',
  },
  {
    id: 'nav-customers',
    label: 'Customers',
    group: 'Navigate',
    icon: PhUsers,
    kind: 'nav',
    to: '/customers',
  },
  {
    id: 'nav-settings',
    label: 'Settings',
    group: 'Navigate',
    icon: PhGear,
    kind: 'nav',
    to: '/settings',
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
  if (item.kind === 'nav' && item.to) {
    void router.push(item.to)
    return
  }
  if (item.kind === 'customer') {
    void router.push('/customers')
    toast(`Opening ${item.label}'s profile isn't wired in this demo.`)
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

// Tour
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
    // The one step that lives on a different page than wherever the tour was
    // started from — onBeforeEnter navigates there first and waits for the
    // real element to exist, rather than assuming a fixed transition length.
    // Targets the small link at the card's own edge, not the card (or its
    // full-height table) itself — a target that tall leaves almost no room
    // for a callout on either side once the viewport gets short.
    target: '#dash-view-all-link',
    title: 'Recent activity',
    description: 'Every new order lands on this list — click through for the full history.',
    side: 'bottom',
    onBeforeEnter: async () => {
      if (route.name !== 'overview') await router.push('/overview')
      await waitForElement('#dash-view-all-link')
    },
  },
]
</script>

<style scoped>
.dash-bleed {
  width: 100vw;
  position: relative;
  inset-inline-start: 50%;
  margin-inline-start: -50vw;
  padding-inline: 1.5rem;
  box-sizing: border-box;
}

.dash-shell {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  overflow: hidden;
  min-block-size: 34rem;
  max-inline-size: 76rem;
  margin-inline: auto;
  background: var(--ui-surface);
  box-shadow: var(--ui-panel-shadow);
  height: 90vh;
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

/* Matches this header's compact scale — Breadcrumb's own default (0.875rem)
   is sized for a full-width page header, not a dense dashboard topbar. The
   library already gets the ancestor-vs-current hierarchy right (muted link,
   full-strength current segment), so nothing else needs overriding here. */
.dash-crumb :deep(.ui-breadcrumb-list) {
  font-size: 0.75rem;
  gap: 0.375rem;
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

/* A readonly trigger dressed as a search field, not an input someone can
   type into — clicking/focusing it opens the real CommandPalette instead.
   The press-scale gives it the same "heard you" feedback as any other
   pressable control here, even though under the hood it's a text field. */
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
</style>
