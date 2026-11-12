<template>
  <section class="demo">
    <h3>Text with a hint</h3>
    <p class="note">
      <code>#label</code> sets the text of a row and keeps its icon and shortcut. Right-click the
      card, or focus it and press the Menu key.
    </p>
    <ContextMenu :items="items">
      <Card class="card" tabindex="0" role="group" aria-label="Project notes">Project notes</Card>
      <template #label="{ item }">
        {{ item.label }}
        <span v-if="item.hint" class="hint">{{ item.hint }}</span>
      </template>
    </ContextMenu>
  </section>
</template>

<script setup lang="ts">
import { PhArrowSquareOut, PhLink } from '@phosphor-icons/vue'
import { Card, ContextMenu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

type Row = MenuItemData & { hint?: string }

const items: MenuEntry<Row>[] = [
  { label: 'Open', value: 'open', icon: PhArrowSquareOut, shortcut: '⏎' },
  { label: 'Copy link', value: 'link', icon: PhLink, hint: 'Anyone with the link' },
]
</script>

<style scoped>
.card {
  padding: 1.5rem;
  max-inline-size: 16rem;
}
.hint {
  margin-inline-start: 0.5rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
</style>
