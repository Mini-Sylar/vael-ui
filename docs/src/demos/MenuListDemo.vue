<template>
  <section class="demo">
    <h2>MenuList</h2>
    <p class="note">
      A static, always-in-flow sibling to <code>Menu</code>, same data-driven row rendering
      (icon/label/shortcut, disabled rows, the <code>#item</code> slot) and the same
      <code>useMenu</code> roving-focus/typeahead keyboard behavior, minus every bit of dropdown
      chrome (no Teleport, no floating position, no open/close). Built for a sidebar nav that's on
      the page permanently, not a transient popup. <code>active</code> is the one thing
      <code>Menu</code> doesn't have, it renders <code>aria-current="page"</code> on the current row
      and drives the sliding indicator you see moving between rows. An <code>items</code> entry (see
      "Team" below) becomes a flattened, always-expanded group label rather than a hover submenu, a
      real collapsible group composes this with the separate Collapsible component.
    </p>

    <div class="menu-list-demo-shell">
      <aside class="menu-list-demo-sidebar">
        <MenuList :items="navItems" :active="activePage" @select="onSelect" />
      </aside>
      <div class="menu-list-demo-main">
        <Card :title="currentItem?.label ?? 'Unknown'">
          <p class="panel-text">
            Try it with a keyboard: Tab into the list, then ↑/↓ (wraps at both ends, skips
            "Settings" since it's disabled and skips the "Team" group label since it's
            non-interactive), Home/End, or type a letter.
          </p>
        </Card>
      </div>
    </div>

    <output class="panel-text" data-testid="menu-list-last-select">
      {{ lastSelected ? `Last selected: ${lastSelected}` : 'No selection yet' }}
    </output>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Card, MenuList } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const navItems: MenuEntry[] = [
  { label: 'Dashboard', value: 'dashboard', shortcut: '⌘1' },
  { label: 'Reports', value: 'reports', shortcut: '⌘2' },
  { label: 'Settings', value: 'settings', disabled: true },
  { type: 'separator' },
  {
    label: 'Team',
    items: [
      { label: 'Members', value: 'members' },
      { label: 'Roles', value: 'roles' },
    ],
  },
  { type: 'separator' },
  { label: 'Billing', value: 'billing', danger: true },
]

function isNavItem(entry: MenuEntry): entry is MenuItemData {
  return 'label' in entry
}

const activePage = shallowRef('dashboard')
const lastSelected = shallowRef('')
const currentItem = computed(() =>
  navItems.filter(isNavItem).find((entry) => entry.value === activePage.value),
)

function onSelect(item: MenuItemData) {
  lastSelected.value = item.label
  if (item.value) activePage.value = item.value
}
</script>

<style scoped>
.menu-list-demo-shell {
  display: flex;
  gap: 1rem;
  align-items: stretch;
}
.menu-list-demo-sidebar {
  inline-size: 14rem;
  flex: none;
  padding: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.menu-list-demo-main {
  flex: 1;
}
</style>
