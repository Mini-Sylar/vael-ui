<template>
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sortable, confirmAction } from 'vael-ui'
import type { SortableDropDetails } from 'vael-ui'

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
</script>

<style scoped>
.sortable-demo-order {
  display: block;
  margin-block-start: 0.75rem;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
