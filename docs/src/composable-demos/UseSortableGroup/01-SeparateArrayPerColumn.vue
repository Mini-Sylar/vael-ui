<template>
  <section class="demo">
    <h3>Raw primitive: separate array per column</h3>
    <p>
      Each column below still calls <code>useSortable()</code> on its own array, exactly like a
      standalone list; the group only lets a drag started in one column cross into another, over the
      same spring-driven engine. You own every bit of the markup.
    </p>
    <div class="board">
      <div v-for="col in boardColumns" :key="col.id" class="board-column">
        <h4>{{ col.label }}</h4>
        <ul class="board-list" :ref="(el) => (boardColumnEls[col.id] = el as HTMLElement | null)">
          <li
            v-for="card in boardData[col.id].value"
            :key="card.id"
            :data-value="card.id"
            class="board-card"
            tabindex="0"
            role="button"
            aria-roledescription="sortable item"
            :data-grabbed="isBoardGrabbed(col.id, card.id) || undefined"
            @pointerdown="boardEngines[col.id].onHandlePointerdown($event, card.id)"
            @keydown="boardEngines[col.id].onHandleKeydown($event, card.id)"
          >
            {{ card.label }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Ref } from 'vue'
import { useSortableGroup } from 'vael-ui'
import type { FlatSortableRow, UseSortableReturn } from 'vael-ui'

type BoardColumnId = 'todo' | 'doing' | 'done'
interface BoardCard {
  id: string
  label: string
}

const boardColumns: { id: BoardColumnId; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In progress' },
  { id: 'done', label: 'Done' },
]
const boardData: Record<BoardColumnId, Ref<BoardCard[]>> = {
  todo: ref([
    { id: 'b1', label: 'Design the empty state' },
    { id: 'b2', label: 'Write the migration' },
  ]),
  doing: ref([{ id: 'b3', label: 'Spring-driven ghost gaps' }]),
  done: ref([{ id: 'b4', label: 'Single-list reorder' }]),
}
const boardColumnEls = reactive<Record<string, HTMLElement | null>>({})

const boardGroup = useSortableGroup({
  onTransfer: (value, from, to) => {
    const source = boardData[from.groupId as BoardColumnId]!.value
    const dest = boardData[to.groupId as BoardColumnId]!.value
    const index = source.findIndex((card) => card.id === value)
    if (index === -1) return
    const [moved] = source.splice(index, 1)
    dest.splice(Math.min(Math.max(to.index, 0), dest.length), 0, moved!)
  },
})

const boardEngines = Object.fromEntries(
  boardColumns.map((col) => [
    col.id,
    boardGroup.join({
      groupId: col.id,
      rows: computed<FlatSortableRow[]>(() =>
        boardData[col.id]!.value.map((card) => ({ value: card.id, depth: 0, parentValue: null })),
      ),
      getElement: (value) =>
        boardColumnEls[col.id]?.querySelector<HTMLElement>(
          `[data-value="${CSS.escape(String(value))}"]`,
        ) ?? null,
      container: () => boardColumnEls[col.id] ?? null,
      onCommit: (value, to) => {
        const arr = boardData[col.id]!.value
        const index = arr.findIndex((card) => card.id === value)
        if (index === -1) return
        const [moved] = arr.splice(index, 1)
        arr.splice(Math.min(Math.max(to.index, 0), arr.length), 0, moved!)
      },
    }),
  ]),
) as Record<BoardColumnId, UseSortableReturn>

function isBoardGrabbed(columnId: BoardColumnId, cardId: string): boolean {
  return boardEngines[columnId]!.isGrabbedValue(cardId)
}
</script>

<style scoped>
.board {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.board-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  inline-size: 14rem;
}
.board-column h4 {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
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
}
.board-card {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  font-size: 0.875rem;
  cursor: grab;
  touch-action: none;
}
.board-card[data-dragging] {
  opacity: 0;
}
.board-card[data-grabbed] {
  border-color: var(--ui-primary);
}
</style>
