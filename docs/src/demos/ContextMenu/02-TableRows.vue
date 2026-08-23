<template>
  <section class="demo">
    <h3>Table rows, each row gets its own menu</h3>
    <p class="note">
      Every row wraps its own <code>ContextMenu</code>, each opening independently at wherever it
      was right-clicked. Nothing is shared between them beyond the same <code>items</code> array.
    </p>
    <div class="row-table">
      <ContextMenu v-for="row in rows" :key="row.id" :items="rowItems(row)" @select="onSelect">
        <div class="table-row">
          <span class="row-dot" :style="{ background: row.color }" />
          <span class="row-name">{{ row.name }}</span>
          <span class="row-role">{{ row.role }}</span>
        </div>
      </ContextMenu>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PhTrash } from '@phosphor-icons/vue'
import { ContextMenu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const lastAction = shallowRef('')
function onSelect(item: MenuItemData) {
  lastAction.value = item.label
}

interface Row {
  id: string
  name: string
  role: string
  color: string
}
const rows: Row[] = [
  { id: 'r1', name: 'Amara Diallo', role: 'Engineering', color: '#6366f1' },
  { id: 'r2', name: 'Kenji Watanabe', role: 'Design', color: '#10b981' },
  { id: 'r3', name: 'Priya Nair', role: 'Product', color: '#f59e0b' },
]
function rowItems(row: Row): MenuEntry[] {
  return [
    { label: `Message ${row.name.split(' ')[0]}`, value: 'message' },
    { label: 'View profile', value: 'view' },
    { type: 'separator' },
    { label: 'Remove from team', value: 'remove', danger: true, icon: PhTrash },
  ]
}
</script>

<style scoped>
.row-table {
  display: flex;
  flex-direction: column;
  inline-size: 100%;
  max-inline-size: 24rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
}
.table-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  cursor: context-menu;
}
.table-row:not(:last-child) {
  border-block-end: 1px solid var(--ui-border);
}
.row-dot {
  inline-size: 0.55rem;
  block-size: 0.55rem;
  border-radius: 50%;
  flex: none;
}
.row-name {
  font-weight: 500;
}
.row-role {
  margin-inline-start: auto;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
