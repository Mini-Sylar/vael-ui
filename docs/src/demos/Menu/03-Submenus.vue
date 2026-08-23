<template>
  <section class="demo">
    <h3>Submenus: recursive, no separate component</h3>
    <p class="note">
      Nest another <code>items</code> array on an entry and it becomes a submenu trigger, a submenu
      is just another Menu instance, one level deeper, reusing everything (positioning, roving
      focus, typeahead). Opens on hover-intent, click, Enter/Space, or ArrowRight; ArrowLeft (or
      moving the pointer away) closes it and returns focus to the parent row. Selecting a leaf
      action closes the whole chain, not just the submenu, try "Copy Link".
    </p>
    <div class="row">
      <Menu :items="fileItems" @select="onSelect">
        <template #trigger>
          <Button variant="secondary">File</Button>
        </template>
      </Menu>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const lastAction = shallowRef('')
function onSelect(item: MenuItemData) {
  lastAction.value = item.label
}

const fileItems: MenuEntry[] = [
  { label: 'New Tab', value: 'new-tab', shortcut: '⌘T' },
  { label: 'New Window', value: 'new-window', shortcut: '⇧⌘N' },
  { type: 'separator' },
  {
    label: 'Share',
    items: [
      { label: 'Copy Link', value: 'copy-link' },
      { label: 'Email', value: 'email' },
      // A submenu nested inside a submenu, proves the recursion isn't one level deep only
      {
        label: 'Social',
        items: [
          { label: 'Twitter', value: 'twitter' },
          { label: 'Mastodon', value: 'mastodon' },
        ],
      },
    ],
  },
  { type: 'separator' },
  { label: 'Print…', value: 'print', shortcut: '⌘P' },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
