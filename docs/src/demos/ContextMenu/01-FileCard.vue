<template>
  <section class="demo">
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
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
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
.panel-text {
  display: block;
  margin-block-start: 1rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
