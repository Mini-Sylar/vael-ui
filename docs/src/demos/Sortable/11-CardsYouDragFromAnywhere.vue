<template>
  <section class="demo">
    <h3>Cards you drag from anywhere</h3>
    <p>
      <code>handle="item"</code> makes the whole card the handle, as on a board. A press that moves
      drags it; one that doesn't is a click on the card, so it opens. From the keyboard, Space picks
      a card up and Enter opens it. <code>variant="plain"</code> drops the row's own box, so the
      cards look like your content.
    </p>
    <div class="board">
      <section v-for="col in columns" :key="col.id" class="column">
        <h4>{{ col.label }}</h4>
        <Sortable
          v-model:items="cards[col.id].value"
          item-key="id"
          label-key="label"
          :group="board"
          :group-id="col.id"
          handle="item"
          variant="plain"
          class="cards"
          @drag-start="held = $event"
          @drag-end="held = null"
        >
          <template #item="{ item }">
            <article class="card" @click="opened = item.label">{{ item.label }}</article>
          </template>
        </Sortable>
      </section>
    </div>
    <p class="status">
      {{ held ? `Holding ${held}` : opened ? `Opened “${opened}”` : 'Click a card, or drag it.' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { Sortable, useSortableGroup } from 'vael-ui'

type ColumnId = 'todo' | 'doing'
const columns: { id: ColumnId; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'Doing' },
]
const cards: Record<ColumnId, Ref<{ id: string; label: string }[]>> = {
  todo: ref([
    { id: 't1', label: 'Write the release notes' },
    { id: 't2', label: 'Review the board' },
    { id: 't3', label: 'Plan the offsite' },
  ]),
  doing: ref([{ id: 'd1', label: 'Fix the upload test' }]),
}
const opened = ref<string | null>(null)
const held = ref<string | number | null>(null)
const board = useSortableGroup({
  onTransfer: (value, from, to) => {
    const source = cards[from.groupId as ColumnId].value
    const index = source.findIndex((card) => card.id === value)
    if (index === -1) return
    const [moved] = source.splice(index, 1)
    cards[to.groupId as ColumnId].value.splice(to.index, 0, moved!)
  },
})
</script>

<style scoped>
.board {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.column {
  inline-size: 14rem;
  padding: 0.5rem;
  border-radius: var(--ui-radius);
  background: var(--ui-muted);
}
h4 {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
}
.cards {
  gap: 0.5rem;
  min-block-size: 2.5rem;
}
.card {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) - 2px);
  background: var(--ui-surface);
  font-size: 0.875rem;
}
.status {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
