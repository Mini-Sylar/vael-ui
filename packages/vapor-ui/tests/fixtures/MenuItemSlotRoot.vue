<template>
  <Menu :items="items" @select="onSelect">
    <template #trigger>
      <button data-testid="vapor-menu-trigger">Open</button>
    </template>
    <!-- Custom row markup. Under the old Vapor build this `#item`, forwarded
         into each nested submenu, re-resolved against the submenu instance and
         called itself until the stack blew. Nothing below should render at all
         if that regresses. -->
    <template #item="{ item }">
      <span data-mark>mark:{{ item.label }}</span>
    </template>
  </Menu>
  <output data-testid="vapor-menu-selected">{{ selected }}</output>
</template>

<script setup lang="ts" vapor>
import { shallowRef } from 'vue'
import { Menu } from 'vael-ui/vapor'
import type { MenuEntry, MenuItemData } from 'vael-ui/vapor'

const items: MenuEntry[] = [
  { label: 'Cut', value: 'cut' },
  {
    label: 'Share',
    items: [
      { label: 'Copy Link', value: 'copy-link' },
      {
        label: 'Social',
        items: [
          { label: 'Twitter', value: 'twitter' },
          { label: 'Mastodon', value: 'mastodon' },
        ],
      },
    ],
  },
]

const selected = shallowRef('')
function onSelect(item: MenuItemData) {
  selected.value = String(item.value ?? '')
}
</script>
