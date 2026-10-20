<template>
  <section class="demo">
    <h3>Keeping the card inside its column</h3>
    <p>
      On a board whose columns have a fixed height, <code>restrict-to-list</code> keeps the floating
      card inside the column it's over. Drag a card below a column: with it on, the card waits at
      the column's bottom edge while the column scrolls to its end, then drops there. With it off,
      the card follows the pointer out of the column. Leave it off for lists that grow with their
      cards.
    </p>
    <div class="row">
      <Switch v-model="restrict" label="Keep the card in its column" />
    </div>
    <div class="board">
      <Card v-for="col in columns" :key="col.id" :title="col.label" class="board-column">
        <Sortable
          v-model:items="cards[col.id].value"
          item-key="id"
          label-key="label"
          :group="board"
          :group-id="col.id"
          preview-mode="clone"
          :restrict-to-list="restrict"
          class="board-list"
        />
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { Card, Sortable, Switch, useSortableGroup } from 'vael-ui'

const restrict = ref(true)

type ColumnId = 'backlog' | 'week'
const columns: { id: ColumnId; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'week', label: 'This week' },
]
const cards: Record<ColumnId, Ref<{ id: string; label: string }[]>> = {
  backlog: ref(
    [
      'Audit the onboarding emails',
      'Fix the flaky upload test',
      'Draft the pricing FAQ',
      'Rename the billing roles',
      'Add CSV export',
      'Tidy the status page',
      'Plan the Q3 roadmap',
    ].map((label, i) => ({ id: `b${i}`, label })),
  ),
  week: ref(
    ['Ship the search filters', 'Review the PR', 'Book the team offsite'].map((label, i) => ({
      id: `w${i}`,
      label,
    })),
  ),
}
const board = useSortableGroup({
  onTransfer: (value, from, to) => {
    const source = cards[from.groupId as ColumnId].value
    const dest = cards[to.groupId as ColumnId].value
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
/* A fixed-height column that scrolls, like a board's. */
.board-list {
  block-size: 11rem;
  overflow-y: auto;
}
</style>
