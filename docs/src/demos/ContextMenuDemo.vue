<template>
  <section class="demo">
    <h2>ContextMenu</h2>
    <p class="note">
      Right-click (or long-press on touch) anywhere in the wrapped area. The panel is a literal
      <code>&lt;Menu&gt;</code> instance, opened at the cursor instead of a trigger button, so it
      inherits everything: roving focus, typeahead, submenus, <code>flip</code>/<code>shift</code>
      keeping it on-screen near an edge. Try right-clicking near the edges of the window.
    </p>

    <h3>File card</h3>
    <div class="row">
      <ContextMenu :items="fileItems" @select="onSelect">
        <Card class="file-card">
          <template #body>
            <div class="file-card-body">
              <span class="file-icon"><PhFileText :size="28" weight="duotone" /></span>
              <div>
                <strong>Quarterly report.pdf</strong>
                <p class="file-meta">2.4 MB, edited 3 days ago</p>
              </div>
            </div>
          </template>
        </Card>
      </ContextMenu>
      <output class="panel-text">{{
        lastAction ? `Last action: ${lastAction}` : 'No action yet'
      }}</output>
    </div>

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
import { PhCopy, PhFileText, PhPencilSimple, PhShare, PhStar, PhTrash } from '@phosphor-icons/vue'
import { Card, ContextMenu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

const lastAction = shallowRef('')
function onSelect(item: MenuItemData) {
  lastAction.value = item.label
}

const fileItems: MenuEntry[] = [
  { label: 'Rename', value: 'rename', icon: PhPencilSimple, shortcut: '⏎' },
  { label: 'Duplicate', value: 'duplicate', icon: PhCopy, shortcut: '⌘D' },
  {
    label: 'Share',
    icon: PhShare,
    items: [
      { label: 'Copy link', value: 'copy-link' },
      { label: 'Invite people…', value: 'invite' },
    ],
  },
  { type: 'separator' },
  { label: 'Favorite', value: 'favorite', icon: PhStar, keepOpen: true },
  { type: 'separator' },
  { label: 'Delete', value: 'delete', icon: PhTrash, danger: true, shortcut: '⌫' },
]

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
.file-card {
  display: inline-block;
  inline-size: 16rem;
  cursor: context-menu;
}
.file-card-body {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.file-icon {
  display: inline-flex;
  flex: none;
  color: var(--ui-primary);
}
.file-meta {
  margin: 0.125rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}

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
