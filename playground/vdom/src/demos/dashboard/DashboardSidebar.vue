<template>
  <aside
    class="dash-sidebar"
    :class="{ 'dash-sidebar--collapsed': collapsed }"
    :style="collapsed ? undefined : { '--dash-sidebar-width': `${sidebarWidth}px` }"
    :data-resizing="isResizing || undefined"
  >
    <!-- Resizable only in the expanded state — the collapsed 4.25rem rail is
         a fixed icon-only width, not a size a user would ever want to drag.
         Reuses the library's own `.ui-resizable-handle` class (from
         `Resizable.vue`/style.css) for a consistent look, but doesn't use
         `<Resizable>` itself: this element must stay a real `<aside>`
         landmark with its own pre-existing collapse/expand transition and
         nav content, not a new wrapping component's root — see
         `useResizable.ts`'s own comment for why it's built to support this
         standalone usage directly. -->
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
      <!-- Top-level, always-in-flow routes — MenuList, not Menu: this list is
           permanently on screen, not a transient dropdown (see MenuList.vue's
           own SFC comment for why that distinction matters for ARIA). `active`
           is wired straight to the current route's path. -->
      <MenuList
        :items="navItems"
        :active="route.path"
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

      <!-- Two structurally-unrelated sidebar groups, each an independent
           Collapsible — replaces the old hand-rolled `useCollapse` pair.
           Collapsible owns its own open/closed state per instance, so
           opening one never touches the other (same guarantee the old
           dashboard's manual useCollapse calls had, now via the real
           component). Collapsed rail: no room to draw an inline panel, so
           each group becomes a Menu flyout instead, same fallback as before. -->
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
              :active="route.fullPath"
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
            <!-- These two rows aren't real routes — this diagnostic build has
                 four pages, not six, so "Reports" stays what it was in the
                 previous single-file dashboard: a second, independent
                 Collapsible proving groups don't share state, wired to a
                 toast instead of a page nobody asked for. -->
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

<!--
  Button's `icon` boolean (square, content-centered) still doesn't compose
  with "leading icon + optional label" across the collapsed/expanded toggle
  without restructuring which slot the icon lives in — same wall the old
  single-file dashboard hit. The `ui` prop's new `{ class, style }` shape
  doesn't change that: it's still one class hook, same as the plain `class`
  binding used before, so the few lines of CSS covering the collapsed square
  look (`.dash-collapse-btn` rules in DashboardDemo.vue's shared styles)
  stay — `ui.root` here is used only so the class survives Button's own
  internal class-merge cleanly, not because it does anything a plain `class`
  attr couldn't.
-->
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const collapsed = shallowRef(false)

// Expanded-state width only — the collapsed rail is a fixed icon-only
// 4.25rem (CSS, `.dash-sidebar--collapsed`), never resizable. Persisted only
// for this component instance's lifetime (a `shallowRef`, no localStorage —
// this is a diagnostic-build demo, not a real app preference the task asked
// to survive a reload).
const SIDEBAR_MIN_WIDTH = 192 // 12rem
const SIDEBAR_MAX_WIDTH = 384 // 24rem
const SIDEBAR_DEFAULT_WIDTH = 248 // 15.5rem — matches this file's own pre-existing `.dash-sidebar` base width below
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

const route = useRoute()
const router = useRouter()

interface NavEntry extends MenuItemData {
  icon: Component
  badge?: number
}

const navItems: NavEntry[] = [
  { label: 'Overview', value: '/overview', icon: PhSquaresFour },
  { label: 'Orders', value: '/orders', icon: PhPackage, badge: 12 },
  { label: 'Customers', value: '/customers', icon: PhUsers },
]

// Phosphor's `fill` weight on the current row is the "you are here" signal's
// second channel (alongside the accent bar in style.css) — a filled glyph
// reads as unmistakably different from every other row's outline icon,
// exactly the "redesign for real clarity" the aria-current audit called for.
function isCurrentNav(item: NavEntry): boolean {
  return item.value === route.path
}

function onNavSelect(item: NavEntry) {
  if (item.value) void router.push(item.value)
}

// Real sub-routes: each child lands on /settings with a different `tab`
// query param, which SettingsPage reads to drive its own <Tabs> — so this
// Collapsible group is genuine navigation, not decoration.
const settingsChildren: MenuItemData[] = [
  { label: 'General', value: '/settings?tab=general' },
  { label: 'Notifications', value: '/settings?tab=notifications' },
  { label: 'Security', value: '/settings?tab=security' },
  { label: 'Billing', value: '/settings?tab=billing' },
]
function onSettingsSelect(item: MenuItemData) {
  if (item.value) void router.push(item.value)
}

// Not real routes — see the template comment above.
const reportsChildren: MenuItemData[] = [
  { label: 'Weekly summary', value: 'weekly-summary' },
  { label: 'Export CSV', value: 'export-csv' },
]
function onReportSelect(item: MenuItemData) {
  toast.info(`"${item.label}" isn't a real page in this diagnostic build.`)
}

const settingsOpen = shallowRef(true)
const reportsOpen = shallowRef(false)

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
  if (item.value) void router.push(item.value)
}

defineExpose({ collapsed })
</script>

<style scoped>
.dash-sidebar {
  position: relative; /* anchors the absolutely-positioned resize handle */
  flex: none;
  /* Indirected through a custom property (set as an inline style only while
     expanded) rather than inline-styling `inline-size` directly — an inline
     style always wins the cascade regardless of specificity, which would
     silently defeat the narrow-viewport auto-collapse override below (same
     class-level specificity, decided by source order today). Routing the
     VALUE through a variable keeps `inline-size` itself declared in plain
     CSS, so that override still applies normally. */
  inline-size: var(--dash-sidebar-width, 15.5rem);
  display: flex;
  flex-direction: column;
  border-inline-end: 1px solid var(--ui-border);
  background: var(--ui-muted);
  padding: 0.75rem;
  gap: 0.5rem;
  /* Width is the one property genuinely worth animating here — everything
     else (label opacity) rides a shorter, separate fade so text disappears
     before the rail finishes narrowing rather than visibly wrapping/
     clipping mid-squeeze. Same token pairing as Accordion's panel
     (--ui-duration-enter/--ui-ease-in-out — see style.css). */
  transition: inline-size var(--ui-duration-enter) var(--ui-ease-in-out);
}
.dash-sidebar--collapsed {
  inline-size: 4.25rem;
}
/* A live drag is direct manipulation — it must never lag behind the
   pointer, so the transition above is suppressed for its whole span. Same
   `data-resizing`-gated pattern as `.ui-resizable` in style.css; re-stated
   locally (not via that shared class) because this element stays a plain
   `<aside>`, not `<Resizable>`'s own root — see the template comment. */
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
  /* Matches the 20px Phosphor icons used everywhere else in this rail
     (collapse toggle, Settings/Reports collapsed-rail triggers) — the
     library's own default (1em, ~14px at this row's font-size) made these
     specific rows' icons render visibly smaller than their neighbors. */
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
  /* Badge's own default sizing targets overlaying an avatar/button corner —
     too large sitting inline in a compact nav row, so this instance shrinks
     it directly (every declared property here wins over Badge's own layered
     default regardless of specificity, per this project's @layer setup). */
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

/* Collapsible's own trigger wrapper is `inline-flex` (shrink-to-fit) by
   design — the right default for a wordless icon trigger, but it means the
   Button's own `block` prop resolves against that shrunken wrapper, not the
   sidebar's available width, and is effectively a no-op. Stretching the
   wrapper itself is what actually makes the row fill the rail. */
:deep(.ui-collapsible-trigger) {
  display: flex;
  inline-size: 100%;
}

.dash-nav-group-trigger,
.dash-nav-group-trigger-collapsed {
  display: flex;
  align-items: center;
  /* Button's own default centers content — these triggers need it flush
     start, so this must be declared explicitly: cascade layers only
     resolve conflicts between rules that both set the same property, an
     unlayered rule that omits justify-content entirely still loses that
     one property to Button's own layered default. */
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
/* The label + chevron both live inside Button's own single `.ui-button-content`
   wrapper (the whole default slot is one span) — for the chevron's own
   margin-inline-start:auto to actually push it to the trigger's far edge,
   that wrapper has to be allowed to grow into the button's remaining width;
   by default it's shrink-to-fit. */
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

/* Same "wrapper is inline-flex, block on the Button alone is a no-op" fix
   as .ui-collapsible-trigger above, for Menu's own trigger wrapper — scoped
   to JUST this account trigger's container, not every .ui-menu-trigger in
   the file: the collapsed-rail Settings/Reports flyout triggers elsewhere
   are icon-only and must stay compact, since Menu anchors its floating
   panel to the trigger WRAPPER's own bounding box — stretching those too
   would shift where their flyout opens from. */
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

/* Below the shell's natural break point, collapse the rail automatically
   rather than letting the shell overflow — the user can still expand it
   manually via the same toggle. */
@media (max-width: 52rem) {
  .dash-sidebar:not(.dash-sidebar--collapsed) {
    inline-size: 4.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dash-sidebar,
  .dash-collapse-btn :deep(svg),
  .dash-nav-group-chevron {
    transition: none;
  }
}
</style>
