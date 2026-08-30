<template>
  <section class="demo">
    <h3>Persisting the new order</h3>
    <p>
      <code>@reorder</code> fires after the move. Since you own the array, an optimistic save rolls
      back by restoring your own snapshot — no extra API.
    </p>
    <Sortable v-model:items="saved" item-key="id" label-key="label" @reorder="persist" />
    <output class="sortable-demo-order">{{ saveState }}</output>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sortable } from 'vael-ui'

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
</script>

<style scoped>
.sortable-demo-order {
  display: block;
  margin-block-start: 0.75rem;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
