<template>
  <aside
    class="dash-sidebar"
    :class="{ 'dash-sidebar--collapsed': collapsed }"
    :style="collapsed ? undefined : { '--dash-sidebar-width': `${sidebarWidth}px` }"
    :data-resizing="isResizing || undefined"
  >
    <div
      v-if="!collapsed"
      class="ui-resizable-handle"
      data-direction="horizontal"
      data-edge="end"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      :aria-valuenow="Math.round(sidebarWidth)"
      :aria-valuemin="SIDEBAR_MIN_WIDTH"
      :aria-valuemax="SIDEBAR_MAX_WIDTH"
      :data-active="isResizing || undefined"
      tabindex="0"
      @pointerdown="onHandlePointerdown"
      @keydown="onHandleKeydown"
    />
    <div class="dash-sidebar-top">
      <div class="dash-brand">
        <span class="dash-brand-mark" aria-hidden="true">U</span>
        <span v-if="!collapsed" class="dash-brand-name">vael-ui admin</span>
      </div>
      <Button
        type="button"
        variant="text"
        :ui="{ root: 'dash-collapse-btn' }"
        :class="{ 'dash-collapse-btn--collapsed': collapsed }"
        :aria-expanded="!collapsed"
        aria-controls="dash-nav"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        v-tooltip.right="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="collapsed = !collapsed"
      >
        <PhSidebarSimple :size="20" />
      </Button>
    </div>

    <nav id="dash-nav" class="dash-nav" aria-label="Main">
      <MenuList
        :items="navItems"
        :active="activePage"
        :ui="{ root: 'dash-nav-list' }"
        @select="onNavSelect"
      >
        <template #item="{ item }">
          <span class="ui-menu-list-item-icon">
            <component
              :is="item.icon"
              :size="20"
              :weight="isCurrentNav(item) ? 'fill' : 'regular'"
            />
          </span>
          <span v-if="!collapsed" class="ui-menu-list-item-label">{{ item.label }}</span>
          <Badge
            v-if="!collapsed && item.badge"
            :count="item.badge"
            variant="danger"
            class="dash-nav-badge"
          />
          <span
            v-if="collapsed"
            class="dash-collapsed-tooltip-anchor"
            v-tooltip.right="item.label"
          />
        </template>
      </MenuList>

      <div class="dash-nav-groups">
        <template v-if="!collapsed">
          <Collapsible v-model:open="settingsOpen" class="dash-nav-group">
            <template #trigger="{ open }">
              <Button variant="ghost" block class="dash-nav-group-trigger">
                <template #leading><PhGear :size="16" /></template>
                <span class="dash-nav-label">Settings</span>
                <PhCaretDown
                  :size="14"
                  class="dash-nav-group-chevron"
                  :class="{ 'dash-nav-group-chevron--open': open }"
                />
              </Button>
            </template>
            <MenuList
              :items="settingsChildren"
              :ui="{ root: 'dash-nav-sublist' }"
              @select="onSettingsSelect"
            />
          </Collapsible>

          <Collapsible v-model:open="reportsOpen" class="dash-nav-group">
            <template #trigger="{ open }">
              <Button variant="ghost" block class="dash-nav-group-trigger">
                <template #leading><PhFileText :size="16" /></template>
                <span class="dash-nav-label">Reports</span>
                <PhCaretDown
                  :size="14"
                  class="dash-nav-group-chevron"
                  :class="{ 'dash-nav-group-chevron--open': open }"
                />
              </Button>
            </template>
            <MenuList
              :items="reportsChildren"
              :ui="{ root: 'dash-nav-sublist' }"
              @select="onReportSelect"
            />
          </Collapsible>
        </template>

        <template v-else>
          <Menu :items="settingsChildren" side="right" align="start" @select="onSettingsSelect">
            <template #trigger>
              <Button
                variant="ghost"
                icon
                class="dash-nav-group-trigger-collapsed"
                aria-label="Settings"
              >
                <PhGear :size="20" />
              </Button>
            </template>
          </Menu>
          <Menu :items="reportsChildren" side="right" align="start" @select="onReportSelect">
            <template #trigger>
              <Button
                variant="ghost"
                icon
                class="dash-nav-group-trigger-collapsed"
                aria-label="Reports"
              >
                <PhFileText :size="20" />
              </Button>
            </template>
          </Menu>
        </template>
      </div>
    </nav>

    <div class="dash-sidebar-bottom">
      <Menu :items="accountMenuItems" side="top" align="start" @select="onAccountSelect">
        <template #trigger>
          <Button variant="ghost" block class="dash-user-trigger" aria-label="Account menu">
            <Avatar name="Ama Mensah" size="sm">
              <template #badge>
                <span class="dash-user-status" aria-hidden="true" />
              </template>
            </Avatar>
            <span v-if="!collapsed" class="dash-user-meta">
              <span class="dash-user-name">Ama Mensah</span>
              <span class="dash-user-role">Workspace admin</span>
            </span>
          </Button>
        </template>
      </Menu>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { Component } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import {
  Avatar,
  Badge,
  Button,
  Collapsible,
  Menu,
  MenuList,
  toast,
  useResizable,
  vTooltip,
} from 'vael-ui'
import type { MenuItemData } from 'vael-ui'
import {
  PhCaretDown,
  PhFileText,
  PhGear,
  PhPackage,
  PhSidebarSimple,
  PhSquaresFour,
  PhUsers,
} from '@phosphor-icons/vue'
import type { DashPage } from './dashboardNavigate'

const activePage = defineModel<DashPage>('activePage', { default: 'overview' })

// Below the shell's natural break point, force the rail collapsed via real
// state (not just a narrower CSS width) so the label/group markup that
// `v-if="!collapsed"` guards actually stops rendering — a CSS-only width
// squeeze left that markup trying to lay out in a rail too narrow for it.
const isNarrow = useMediaQuery('(max-width: 52rem)')
const manualCollapsed = shallowRef(false)
const collapsed = computed({
  get: () => manualCollapsed.value || isNarrow.value,
  set: (v: boolean) => (manualCollapsed.value = v),
})

const SIDEBAR_MIN_WIDTH = 192
const SIDEBAR_MAX_WIDTH = 384
const SIDEBAR_DEFAULT_WIDTH = 248
const sidebarWidth = shallowRef(SIDEBAR_DEFAULT_WIDTH)

const {
  isDragging: isResizing,
  onHandlePointerdown,
  onHandleKeydown,
} = useResizable(sidebarWidth, {
  min: SIDEBAR_MIN_WIDTH,
  max: SIDEBAR_MAX_WIDTH,
  direction: 'horizontal',
  edge: 'end',
})

interface NavEntry extends MenuItemData {
  icon: Component
  badge?: number
}

const navItems: NavEntry[] = [
  { label: 'Overview', value: 'overview', icon: PhSquaresFour },
  { label: 'Orders', value: 'orders', icon: PhPackage, badge: 12 },
  { label: 'Customers', value: 'customers', icon: PhUsers },
]

function isCurrentNav(item: NavEntry): boolean {
  return item.value === activePage.value
}

function onNavSelect(item: NavEntry) {
  if (item.value) activePage.value = item.value as DashPage
}

// Settings/Reports aren't real pages in this landing-page showcase — same
// "diagnostic build" honesty as the source dashboard's own Reports group.
const settingsChildren: MenuItemData[] = [
  { label: 'General', value: 'general' },
  { label: 'Notifications', value: 'notifications' },
  { label: 'Security', value: 'security' },
  { label: 'Billing', value: 'billing' },
]
function onSettingsSelect(item: MenuItemData) {
  toast.info(`"${item.label}" isn't wired to a real page in this showcase.`)
}

const reportsChildren: MenuItemData[] = [
  { label: 'Weekly summary', value: 'weekly-summary' },
  { label: 'Export CSV', value: 'export-csv' },
]
function onReportSelect(item: MenuItemData) {
  toast.info(`"${item.label}" isn't a real page in this showcase.`)
}

const settingsOpen = shallowRef(true)
const reportsOpen = shallowRef(false)

const accountMenuItems: MenuItemData[] = [
  { label: 'Profile', value: 'profile' },
  { label: 'Billing', value: 'billing' },
  { label: 'Sign out', value: 'signout', danger: true },
]
function onAccountSelect(item: MenuItemData) {
  if (item.value === 'signout') {
    toast('Signed out (nothing actually happens in this demo).')
    return
  }
  toast.info(`"${item.label}" isn't wired to a real page in this showcase.`)
}

defineExpose({ collapsed })
</script>

<style scoped>
.dash-sidebar {
  position: relative;
  flex: none;
  inline-size: var(--dash-sidebar-width, 15.5rem);
  display: flex;
  flex-direction: column;
  border-inline-end: 1px solid var(--ui-border);
  background: var(--ui-muted);
  padding: 0.75rem;
  gap: 0.5rem;
  transition: inline-size var(--ui-duration-enter) var(--ui-ease-in-out);
}
.dash-sidebar--collapsed {
  inline-size: 4.25rem;
}
.dash-sidebar[data-resizing] {
  transition: none;
}

.dash-sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 0.375rem;
  padding-block-start: 0.25rem;
  min-block-size: 2rem;
}

.dash-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
}
.dash-brand-mark {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 8px;
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  font-size: 0.8125rem;
  font-weight: 700;
}
.dash-brand-name {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

.dash-collapse-btn :deep(svg) {
  transition: transform var(--ui-duration-enter) var(--ui-ease-in-out);
}
.dash-collapse-btn--collapsed :deep(svg) {
  transform: rotate(180deg);
}

.dash-nav {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  overflow-x: hidden;
  overflow-y: auto;
  flex: 1 1 auto;
}

:deep(.dash-nav-list) {
  gap: 0.125rem;
  --ui-menu-list-icon-size: 1.25rem;
}
:deep(.ui-menu-list-item-icon) {
  flex: none;
}
.dash-sidebar--collapsed :deep(.dash-nav-list .ui-menu-list-item) {
  justify-content: center;
  padding-inline: 0;
}
.dash-nav-badge {
  margin-inline-start: auto;
  min-inline-size: 1rem;
  block-size: 1rem;
  padding-inline: 0.3125rem;
  font-size: 0.625rem;
}
.dash-collapsed-tooltip-anchor {
  position: absolute;
  inset: 0;
}

.dash-nav-groups {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin-block-start: 0.5rem;
  padding-block-start: 0.5rem;
  border-block-start: 1px solid var(--ui-border);
}

:deep(.ui-collapsible-trigger) {
  display: flex;
  inline-size: 100%;
}

.dash-nav-group-trigger,
.dash-nav-group-trigger-collapsed {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.625rem;
  inline-size: 100%;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ui-text-muted);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  text-align: start;
  cursor: pointer;
}
.dash-nav-group-trigger-collapsed {
  justify-content: center;
  padding-inline: 0;
}
.dash-nav-group-trigger :deep(.ui-button-content) {
  flex: 1;
}
.dash-nav-group-trigger:hover,
.dash-nav-group-trigger-collapsed:hover {
  background: var(--ui-muted-hover);
  color: var(--ui-text);
}
.dash-nav-group-trigger:focus-visible,
.dash-nav-group-trigger-collapsed:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}

.dash-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dash-nav-group-chevron {
  margin-inline-start: auto;
  flex: none;
  transition: transform var(--ui-duration-enter) var(--ui-ease-in-out);
}
.dash-nav-group-chevron--open {
  transform: rotate(180deg);
}

:deep(.dash-nav-sublist) {
  padding-block: 0.125rem 0.25rem;
  padding-inline-start: 1.75rem;
}
:deep(.dash-nav-sublist .ui-menu-list-item) {
  font-size: 0.8125rem;
}

.dash-sidebar-bottom {
  border-block-start: 1px solid var(--ui-border);
  padding-block-start: 0.5rem;
}

.dash-sidebar-bottom :deep(.ui-menu-trigger) {
  display: flex;
  inline-size: 100%;
}

.dash-user-trigger {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  inline-size: 100%;
  padding: 0.375rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: start;
}
.dash-user-trigger:hover {
  background: var(--ui-muted-hover);
}
.dash-user-trigger:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}

.dash-user-status {
  display: block;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 50%;
  background: var(--ui-success);
  box-shadow: 0 0 0 2px var(--ui-muted);
}

.dash-user-meta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-inline-size: 0;
}
.dash-user-name {
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-user-role {
  font-size: 0.6875rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  .dash-sidebar,
  .dash-collapse-btn :deep(svg),
  .dash-nav-group-chevron {
    transition: none;
  }
}
</style>
