<!-- A command menu opened many times a day: the built-in look, no bounce, a highlight sliding between rows. -->
<template>
  <section class="demo">
    <h3>Command menu</h3>
    <Menu :items="items" @select="(item: MenuItemData) => (ran = item.label)">
      <template #trigger>
        <Button variant="secondary">
          <template #leading><PhMagnifyingGlass /></template>
          Command menu
        </Button>
      </template>
    </Menu>
    <p class="ran">{{ ran ? `Ran: ${ran}` : 'Nothing run yet' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

const items: MenuEntry[] = [
  { label: 'New document', value: 'new-doc', shortcut: '⌘N' },
  { label: 'New folder', value: 'new-folder', shortcut: '⇧⌘N' },
  { label: 'Search', value: 'search', shortcut: '⌘F' },
  { type: 'separator' },
  { label: 'Settings', value: 'settings', shortcut: '⌘,' },
  { label: 'Delete', value: 'delete', danger: true, shortcut: '⌫' },
]
const ran = shallowRef('')
</script>

<style scoped>
.demo {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.75rem;
  min-block-size: 18rem;
  padding-block-start: 2rem;
}
.ran {
  margin: 0;
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
