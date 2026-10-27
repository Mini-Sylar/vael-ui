<template>
  <section class="demo">
    <h3>A fixed header and footer around a scrolling list</h3>
    <p class="note">
      A workspace switcher: the account header and the “Add another account” footer stay fixed while
      the 20 rows scroll between them. The panel is a flex column, and the list is its only
      scrolling child.
    </p>
    <div class="row">
      <Menu :items="workspaceItems" @select="onSelect">
        <template #trigger>
          <Button>Switch workspace</Button>
        </template>
        <template #header>
          <div class="account-header">
            <span class="account-name">{{ currentWorkspace }}</span>
            <span class="account-email">you@example.com</span>
          </div>
        </template>
        <template #footer>
          <Button variant="ghost" block size="sm" @click="addAccount">+ Add another account</Button>
        </template>
      </Menu>
      <output class="panel-text">{{ status }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const currentWorkspace = shallowRef('Acme Inc.')
const status = shallowRef('')

const workspaceItems: MenuEntry[] = Array.from({ length: 20 }, (_, i) => ({
  label: `Workspace ${i + 1}`,
  value: `workspace-${i + 1}`,
}))

function onSelect(item: MenuItemData) {
  currentWorkspace.value = item.label
  status.value = `Switched to ${item.label}`
}
function addAccount() {
  status.value = 'Opening account setup...'
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.panel-text {
  font-size: 0.8125rem;
}
.account-header {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.account-name {
  font-size: 0.875rem;
  font-weight: 500;
}
.account-email {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
</style>
