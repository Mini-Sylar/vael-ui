<template>
  <section class="demo">
    <h3>Drag to reorder</h3>
    <p>
      Grab a handle and drag, or focus one and press <Kbd>Space</Kbd>, then <Kbd>↑</Kbd>/<Kbd
        >↓</Kbd
      >
      to move and <Kbd>Space</Kbd> to drop (<Kbd>Esc</Kbd> cancels). Both paths drive the same
      state.
    </p>
    <Sortable v-model:items="tasks" item-key="id" label-key="title" class="sortable-demo-list">
      <template #item="{ item }">
        <div class="sortable-demo-row">
          <span class="sortable-demo-title">{{ item.title }}</span>
          <Tag :variant="item.variant" size="sm">{{ item.stage }}</Tag>
        </div>
      </template>
    </Sortable>
    <output class="sortable-demo-order">{{ tasks.map((t) => t.title).join(' → ') }}</output>
  </section>

  <section class="demo">
    <h3>Horizontal</h3>
    <p>
      <code>axis="x"</code> reorders along the row instead — the same engine that will drive table
      column reorder. Arrow keys follow the axis (<Kbd>←</Kbd>/<Kbd>→</Kbd>).
    </p>
    <Sortable v-model:items="columns" axis="x" item-key="id" label-key="label" />
  </section>

  <section class="demo">
    <h3>Confirm before dropping</h3>
    <p>
      <code>beforeDrop</code> gates the move. Return a promise and the drop waits — which is exactly
      what <code>confirmAction().result</code> already is, so a confirmation is one line. A
      rejection (a failed API call) reverts and fires <code>@drop-error</code> instead of leaving
      the row half-moved.
    </p>
    <Sortable
      v-model:items="guarded"
      item-key="id"
      label-key="label"
      :before-drop="confirmMove"
      @drop-error="lastError = String($event)"
    />
    <output v-if="lastError" class="sortable-demo-order">{{ lastError }}</output>
  </section>

  <section class="demo">
    <h3>Persisting the new order</h3>
    <p>
      <code>@reorder</code> fires after the move. Since you own the array, an optimistic save rolls
      back by restoring your own snapshot — no extra API.
    </p>
    <Sortable v-model:items="saved" item-key="id" label-key="label" @reorder="persist" />
    <output class="sortable-demo-order">{{ saveState }}</output>
  </section>

  <section class="demo">
    <h3>Without the built-in motion</h3>
    <p>
      <code>motionCss="false"</code> skips the springs entirely — rows snap to their new slots,
      leaving the motion to you.
    </p>
    <Sortable v-model:items="plain" item-key="id" label-key="label" :motion-css="false" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Kbd, Sortable, Tag, confirmAction } from 'vael-ui'
import type { SortableDropDetails } from 'vael-ui'

const tasks = ref([
  { id: 't1', title: 'Audit the drag physics', stage: 'In review', variant: 'warning' as const },
  { id: 't2', title: 'Wire the live region', stage: 'Done', variant: 'success' as const },
  { id: 't3', title: 'Nested tree reorder', stage: 'Next', variant: 'primary' as const },
  { id: 't4', title: 'Column reorder', stage: 'Backlog', variant: 'muted' as const },
])

const columns = ref([
  { id: 'c1', label: 'Order' },
  { id: 'c2', label: 'Customer' },
  { id: 'c3', label: 'Amount' },
  { id: 'c4', label: 'Status' },
])

const guarded = ref([
  { id: 'g1', label: 'Invoices' },
  { id: 'g2', label: 'Contracts' },
  { id: 'g3', label: 'Receipts' },
])
// `result` is already a Promise<boolean | undefined>, so it IS the gate.
async function confirmMove({ value }: SortableDropDetails) {
  const item = guarded.value.find((i) => i.id === value)
  return (
    (await confirmAction({
      title: `Move ${item?.label}?`,
      description: 'This would normally hit your API before committing.',
      confirmLabel: 'Move',
    }).result) === true
  )
}
const lastError = ref('')

const saved = ref([
  { id: 's1', label: 'Draft' },
  { id: 's2', label: 'In review' },
  { id: 's3', label: 'Published' },
])
const saveState = ref('No changes yet.')
async function persist() {
  const snapshot = [...saved.value]
  saveState.value = 'Saving…'
  try {
    await new Promise((resolve) => setTimeout(resolve, 400))
    saveState.value = `Saved: ${saved.value.map((s) => s.label).join(' → ')}`
  } catch {
    saved.value = snapshot
    saveState.value = 'Save failed — order restored.'
  }
}

const plain = ref([
  { id: 'p1', label: 'First' },
  { id: 'p2', label: 'Second' },
  { id: 'p3', label: 'Third' },
])
</script>

<style scoped>
.sortable-demo-list {
  max-inline-size: 26rem;
}
.sortable-demo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.sortable-demo-title {
  font-size: 0.875rem;
}
.sortable-demo-order {
  display: block;
  margin-block-start: 0.75rem;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
