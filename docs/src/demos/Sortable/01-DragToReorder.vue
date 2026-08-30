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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Kbd, Sortable, Tag } from 'vael-ui'

const tasks = ref([
  { id: 't1', title: 'Audit the drag physics', stage: 'In review', variant: 'warning' as const },
  { id: 't2', title: 'Wire the live region', stage: 'Done', variant: 'success' as const },
  { id: 't3', title: 'Nested tree reorder', stage: 'Next', variant: 'primary' as const },
  { id: 't4', title: 'Column reorder', stage: 'Backlog', variant: 'muted' as const },
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
