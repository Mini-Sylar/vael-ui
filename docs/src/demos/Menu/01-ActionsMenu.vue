<template>
  <section class="demo">
    <h3>Actions menu: disabled, keep-open, and danger rows</h3>
    <div class="row">
      <Menu :items="actionItems" @select="onSelect">
        <template #trigger>
          <Button>Actions</Button>
        </template>
      </Menu>
      <output class="panel-text">
        {{ lastAction ? `Last action: ${lastAction}` : 'No action yet' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const lastAction = shallowRef('')
function onSelect(item: MenuItemData) {
  lastAction.value = item.label
}

const favorited = shallowRef(false)
const actionItems = computed<MenuEntry[]>(() => [
  { label: 'Rename', value: 'rename', shortcut: '⌘R' },
  { label: 'Duplicate', value: 'duplicate', shortcut: '⌘D' },
  {
    label: favorited.value ? '★ Favorited' : '☆ Favorite',
    value: 'favorite',
    keepOpen: true,
    onSelect: () => (favorited.value = !favorited.value),
  },
  { type: 'separator' },
  // Conditional via plain reactivity, computed() reruns when favorited changes
  { label: 'Archive', value: 'archive', disabled: !favorited.value },
  { label: 'Delete', value: 'delete', danger: true },
])
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.panel-text {
  display: block;
  margin-block-start: 1rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
