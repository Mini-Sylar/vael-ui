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
              <nav aria-label="Breadcrumb" class="dash-crumb">
                <ol class="dash-crumb-trail">
                  <li class="dash-crumb-item">
                    <Button variant="ghost" size="sm" class="dash-crumb-link">Home</Button>
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
              <Input
                v-model="globalSearch"
                placeholder="Search orders, customers…"
                class="dash-search"
              >
                <template #start>
                  <PhMagnifyingGlass :size="16" />
                </template>
              </Input>
              <Button
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
                  <Button variant="ghost" icon pill aria-label="Account menu">
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
import { useRoute } from 'vue-router'
import { Avatar, Button, Input, Menu, toast, vTooltip } from 'vael-ui'
import type { MenuItemData } from 'vael-ui'
import { PhBell, PhCaretRight, PhMagnifyingGlass } from '@phosphor-icons/vue'
import DashboardSidebar from './DashboardSidebar.vue'

const route = useRoute()
const pageTitle = computed(() => (route.meta.title as string | undefined) ?? 'Dashboard')

const globalSearch = shallowRef('')

const accountMenuItems: MenuItemData[] = [
  { label: 'Profile', value: 'profile' },
  { label: 'Billing', value: 'billing' },
  { label: 'Sign out', value: 'signout', danger: true },
]
function onAccountSelect(item: MenuItemData) {
  toast(`"${item.label}" isn't wired to a real action in this diagnostic build.`)
}
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

/* Hierarchy was backwards: the ancestor link read darker/bolder than the
   "you are here" segment, and the current-page label duplicated the H1
   right below it with no visual distinction earning its own place. An
   ancestor link is secondary (muted, only earns full-strength text on
   hover, the same resting/hover contract every other muted nav trigger in
   this file uses); the current segment is the one truly informative part
   of the trail and now reads as the stronger of the two. */
.dash-crumb-link {
  padding-inline: 0.375rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
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
</style>
