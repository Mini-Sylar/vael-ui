<template>
  <section class="demo">
    <h3>Moving cards between lists</h3>
    <p>
      Lists that share a <code>group</code> from
      <RouterLink to="/composables/useSortableGroup">useSortableGroup()</RouterLink> let cards move
      between them. Grab a card anywhere. The list under it highlights and shows “Drop in …”.
      <code>preview-mode</code> sets what follows the pointer:
    </p>
    <ul class="modes">
      <li>
        <strong>Move the card</strong> (<code>element</code>, the default): the card itself travels.
        Use it for most lists.
      </li>
      <li>
        <strong>Float a copy</strong> (<code>clone</code>): a copy follows the pointer, and the
        original moves to where the card will land, shown here dashed. Use it when the card can't
        leave its layout, like a table row. It also helps in a list that scrolls, which would cut
        the real card off at its edges.
      </li>
    </ul>
    <div class="row">
      <SelectButton
        v-model="previewMode"
        :items="previewModes"
        :allow-empty="false"
        size="sm"
        aria-label="Preview mode"
      />
    </div>
    <div class="board">
      <Card
        v-for="(col, i) in shortcutColumns"
        :key="col.id"
        :title="col.label"
        class="board-column"
      >
        <Sortable
          ref="sortableRefs"
          v-model:items="shortcutData[col.id].value"
          item-key="id"
          label-key="label"
          :group="shortcutGroup"
          :group-id="col.id"
          :preview-mode="previewMode"
          :ui="{ item: 'board-card', handle: 'board-card-handle' }"
          class="board-list"
        >
          <template #item="{ item }">{{ item.label }}</template>
        </Sortable>
        <p v-if="sortableRefs?.[i]?.isForeignDropTarget" class="board-drop-hint">
          Drop in {{ col.label }}
        </p>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import type { Ref } from 'vue'
import { Card, SelectButton, Sortable, useSortableGroup } from 'vael-ui'

const previewModes = [
  { label: 'Move the card', value: 'element' },
  { label: 'Float a copy', value: 'clone' },
]
const previewMode = ref<'element' | 'clone'>('element')

type ShortcutColumnId = 'todo' | 'done'
const shortcutColumns: { id: ShortcutColumnId; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'done', label: 'Done' },
]
const shortcutData: Record<ShortcutColumnId, Ref<{ id: string; label: string }[]>> = {
  todo: ref([
    { id: 's1', label: 'Review the PR' },
    { id: 's2', label: 'Write release notes' },
    { id: 's3', label: 'Update the changelog' },
  ]),
  done: ref([{ id: 's4', label: 'Merge it' }]),
}
const sortableRefs = useTemplateRef<{ isForeignDropTarget: boolean }[]>('sortableRefs')
const shortcutGroup = useSortableGroup({
  onTransfer: (value, from, to) => {
    const source = shortcutData[from.groupId as ShortcutColumnId]!.value
    const dest = shortcutData[to.groupId as ShortcutColumnId]!.value
    const index = source.findIndex((card) => card.id === value)
    if (index === -1) return
    const [moved] = source.splice(index, 1)
    dest.splice(Math.min(Math.max(to.index, 0), dest.length), 0, moved!)
  },
})
</script>

<style scoped>
.board {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.board-column {
  inline-size: 14rem;
}
.board-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  min-block-size: 3rem;
}
.board-drop-hint {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--ui-primary);
  text-align: center;
}

.modes {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding-inline-start: 1.25rem;
}

/* Grabbable from anywhere on the card, not just the handle: the handle button
   already covers the whole item's hit area, so this just stretches it visibly
   and lets the label sit on top without blocking the pointer from reaching it.
   Classes from Sortable's `ui`, so the floating copy, which sits outside the list, matches. */
:global(.board-card) {
  position: relative;
}
:global(.board-card-handle) {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  justify-content: flex-start;
  padding-inline-start: 0.625rem;
  /* The handle itself has no visible surface now that it covers the whole
     card — its own :active scale only ever moved the icon. The card is
     what should visibly press. */
  transform: none;
}
:global(.board-card:active) {
  transform: scale(0.98);
}
:global(.board-card .ui-sortable-content) {
  position: relative;
  padding-inline-start: 1.875rem;
  pointer-events: none;
}

/* With "Float a copy", the original is the placeholder: it moves to where the card will land.
   Sortable hides it by default; here it shows, dashed, so you can see the result before you drop. */
.board-list :deep(.ui-sortable-item[data-sortable-source]) {
  visibility: visible;
  border-style: dashed;
  background: transparent;
  box-shadow: none;
}
.board-list :deep(.ui-sortable-item[data-sortable-source] > *) {
  opacity: 0.45;
}
/* A label sitting on the dashed top edge, clear of the card's own text. */
.board-list :deep(.ui-sortable-item[data-sortable-source])::after {
  content: 'Original';
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0.625rem;
  translate: 0 -50%;
  padding-inline: 0.25rem;
  background: var(--ui-surface);
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1;
  color: var(--ui-text-muted);
}
</style>
