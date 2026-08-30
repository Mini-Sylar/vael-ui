<template>
  <section class="demo">
    <h3>Cross-container drag: the &lt;Sortable&gt; shortcut</h3>
    <p>
      Dragging an item out of one list and into another — a Kanban board — is
      <code>useSortableGroup()</code>, not a component; see its own
      <RouterLink to="/composables/useSortableGroup">composable page</RouterLink> for the raw
      primitive. For the common case, <code>&lt;Sortable&gt;</code> takes the same
      <code>group</code>/<code>group-id</code> the primitive does, so a board needs zero manual
      composable wiring. Cards are grabbable anywhere on their surface, not just a small handle, and
      the column your drag is currently hovering tints and names itself, so it reads as a container
      you're dropping into rather than a second, unrelated list.
    </p>
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
import { Card, Sortable, useSortableGroup } from 'vael-ui'

type ShortcutColumnId = 'todo' | 'done'
const shortcutColumns: { id: ShortcutColumnId; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'done', label: 'Done' },
]
const shortcutData: Record<ShortcutColumnId, Ref<{ id: string; label: string }[]>> = {
  todo: ref([{ id: 's1', label: 'Review the PR' }]),
  done: ref([{ id: 's2', label: 'Merge it' }]),
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

/* Grabbable from anywhere on the card, not just the handle: the handle button
   already covers the whole item's hit area, so this just stretches it visibly
   and lets the label sit on top without blocking the pointer from reaching it. */
.board-list :deep(.ui-sortable-item) {
  position: relative;
}
.board-list :deep(.ui-sortable-handle) {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  justify-content: flex-start;
  padding-inline-start: 0.625rem;
}
.board-list :deep(.ui-sortable-content) {
  position: relative;
  pointer-events: none;
}
</style>
