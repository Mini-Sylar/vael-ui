<template>
  <section class="demo">
    <h3>Cross-container drag: the &lt;Sortable&gt; shortcut</h3>
    <p>
      Dragging an item out of one list and into another — a Kanban board — is
      <code>useSortableGroup()</code>, not a component; see its own
      <RouterLink to="/composables/useSortableGroup">composable page</RouterLink> for the raw
      primitive. For the common case, <code>&lt;Sortable&gt;</code> takes the same
      <code>group</code>/<code>group-id</code> the primitive does, so a board needs zero manual
      composable wiring.
    </p>
    <div class="board">
      <Sortable
        v-for="col in shortcutColumns"
        :key="col.id"
        v-model:items="shortcutData[col.id].value"
        item-key="id"
        label-key="label"
        :group="shortcutGroup"
        :group-id="col.id"
        class="board-list"
      >
        <template #item="{ item }">{{ item.label }}</template>
      </Sortable>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { Sortable, useSortableGroup } from 'vael-ui'

type ShortcutColumnId = 'todo' | 'done'
const shortcutColumns: { id: ShortcutColumnId; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'done', label: 'Done' },
]
const shortcutData: Record<ShortcutColumnId, Ref<{ id: string; label: string }[]>> = {
  todo: ref([{ id: 's1', label: 'Review the PR' }]),
  done: ref([{ id: 's2', label: 'Merge it' }]),
}
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
.board-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  min-block-size: 3rem;
  padding-block-end: 0.5rem;
  inline-size: 14rem;
}
</style>
