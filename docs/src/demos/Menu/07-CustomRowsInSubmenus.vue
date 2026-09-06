<template>
  <section class="demo">
    <h3>Custom rows through nested submenus</h3>
    <p class="note">
      The <code>#item</code> slot keeps rendering your own markup at every depth — a submenu row is
      not a separate, un-styleable path. Here each row is a glyph, a label, and a hint line, three
      levels deep.
    </p>
    <div class="row">
      <Menu :items="items" @select="onSelect">
        <template #trigger>
          <Button variant="secondary">Insert</Button>
        </template>
        <template #item="{ item }">
          <span class="cell">
            <span class="cell-glyph" aria-hidden="true">{{ item.glyph ?? '•' }}</span>
            <span class="cell-text">
              <span class="cell-label">{{ item.label }}</span>
              <span v-if="item.hint" class="cell-hint">{{ item.hint }}</span>
            </span>
          </span>
        </template>
      </Menu>
      <output class="panel-text">{{
        picked ? `Inserted: ${picked}` : 'Nothing inserted yet'
      }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'

interface Row extends MenuItemData {
  glyph?: string
  hint?: string
  items?: Row[]
}

const picked = shallowRef('')
function onSelect(item: MenuItemData) {
  picked.value = (item as Row).label
}

const items: MenuEntry<Row>[] = [
  { label: 'Text', value: 'text', glyph: 'T', hint: 'Plain paragraph' },
  {
    label: 'Media',
    glyph: '▣',
    items: [
      { label: 'Image', value: 'image', glyph: '🖼', hint: 'Upload or paste a URL' },
      { label: 'Video', value: 'video', glyph: '▶', hint: 'YouTube, Vimeo, or a file' },
      {
        label: 'Embed',
        glyph: '⧉',
        items: [
          { label: 'Figma', value: 'figma', glyph: 'F', hint: 'Live design frame' },
          { label: 'CodePen', value: 'codepen', glyph: '{ }', hint: 'Runnable snippet' },
        ],
      },
    ],
  },
  { type: 'separator' },
  { label: 'Divider', value: 'divider', glyph: '—', hint: 'Horizontal rule' },
]
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
.cell {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.cell-glyph {
  display: grid;
  place-items: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  border-radius: calc(var(--ui-radius) - 4px);
  background: var(--ui-muted);
  font-size: 0.75rem;
}
.cell-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.cell-hint {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
</style>
