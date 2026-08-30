<template>
  <section class="demo">
    <h3>One array, a status field</h3>
    <p>
      The group doesn't assume separate arrays per column — real Kanban data is often one flat list
      with a status. <code>onTransfer</code> reassigns the field (and re-splices to respect the
      dropped position); each column is a filtered <code>computed()</code> view over the same
      source.
    </p>
    <div class="board">
      <div v-for="col in flatColumns" :key="col.id" class="board-column">
        <h4>{{ col.label }}</h4>
        <ul class="board-list" :ref="(el) => (flatColumnEls[col.id] = el as HTMLElement | null)">
          <li
            v-for="card in flatCardsIn(col.id)"
            :key="card.id"
            :data-value="card.id"
            class="board-card"
            tabindex="0"
            role="button"
            aria-roledescription="sortable item"
            @pointerdown="flatEngines[col.id].onHandlePointerdown($event, card.id)"
            @keydown="flatEngines[col.id].onHandleKeydown($event, card.id)"
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
import { useSortableGroup } from 'vael-ui'
import type { FlatSortableRow, UseSortableReturn } from 'vael-ui'

type FlatStatus = 'backlog' | 'shipped'
interface FlatCard {
  id: string
  label: string
  status: FlatStatus
}

const flatColumns: { id: FlatStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'shipped', label: 'Shipped' },
]
const flatCards = ref<FlatCard[]>([
  { id: 'f1', label: 'Spec the API', status: 'backlog' },
  { id: 'f2', label: 'Write the docs', status: 'backlog' },
  { id: 'f3', label: 'Ship the engine', status: 'shipped' },
])
const flatColumnEls = reactive<Record<string, HTMLElement | null>>({})

function flatCardsIn(status: FlatStatus): FlatCard[] {
  return flatCards.value.filter((card) => card.status === status)
}

// `to.index` is a position among same-status cards, not in the flat array
// itself — moving the card to the right status isn't enough, it also has to
// land at the absolute index that makes it fall at `to.index` once filtered
// again, or the engine's FLIP animation and the actual re-render disagree
// about where it ended up.
function moveFlatCard(value: string | number, status: FlatStatus, index: number) {
  const from = flatCards.value.findIndex((c) => c.id === value)
  if (from === -1) return
  const [moved] = flatCards.value.splice(from, 1)
  moved!.status = status
  const sameStatus = flatCards.value.filter((c) => c.status === status)
  const target = sameStatus[index]
  const insertAt = target ? flatCards.value.indexOf(target) : flatCards.value.length
  flatCards.value.splice(insertAt, 0, moved!)
}

const flatGroup = useSortableGroup({
  onTransfer: (value, _from, to) => moveFlatCard(value, to.groupId as FlatStatus, to.index),
})

const flatEngines = Object.fromEntries(
  flatColumns.map((col) => [
    col.id,
    flatGroup.join({
      groupId: col.id,
      rows: computed<FlatSortableRow[]>(() =>
        flatCardsIn(col.id).map((card) => ({ value: card.id, depth: 0, parentValue: null })),
      ),
      getElement: (value) =>
        flatColumnEls[col.id]?.querySelector<HTMLElement>(
          `[data-value="${CSS.escape(String(value))}"]`,
        ) ?? null,
      container: () => flatColumnEls[col.id] ?? null,
      onCommit: (value, to) => moveFlatCard(value, col.id, to.index),
    }),
  ]),
) as Record<FlatStatus, UseSortableReturn>
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
</style>
