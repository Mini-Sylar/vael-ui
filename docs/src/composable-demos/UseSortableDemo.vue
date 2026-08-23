<template>
  <section class="demo">
    <ul ref="listEl" class="list">
      <li
        v-for="item in items"
        :key="item.id"
        :data-value="item.id"
        class="row"
        :data-grabbed="isGrabbedValue(item.id) || undefined"
      >
        <button
          type="button"
          class="handle"
          :aria-label="`Reorder ${item.label}`"
          aria-roledescription="sortable item"
          :aria-describedby="instructionsId"
          @pointerdown="onHandlePointerdown($event, item.id)"
          @keydown="onHandleKeydown($event, item.id)"
        >
          ⠿
        </button>
        <span>{{ item.label }}</span>
      </li>
    </ul>
    <span :id="instructionsId" class="sr-only">
      Space or Enter grabs the row; arrow keys move it; Space or Enter drops it; Escape cancels.
    </span>
    <span class="sr-only" role="status" aria-live="assertive">{{ announcement }}</span>
    <output class="demo-status">{{ items.map((i) => i.label).join(' → ') }}</output>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import { useSortable } from 'vael-ui'
import type { FlatSortableRow } from 'vael-ui'

const items = ref([
  { id: 'apple', label: 'Apple' },
  { id: 'banana', label: 'Banana' },
  { id: 'cherry', label: 'Cherry' },
  { id: 'date', label: 'Date' },
])

const listEl = useTemplateRef<HTMLElement>('listEl')
const instructionsId = useId()

const rows = computed<FlatSortableRow[]>(() =>
  items.value.map((item) => ({ value: item.id, depth: 0, parentValue: null })),
)

function getElement(value: string | number): HTMLElement | null {
  return (
    listEl.value?.querySelector<HTMLElement>(`[data-value="${CSS.escape(String(value))}"]`) ?? null
  )
}

const { isGrabbedValue, announcement, onHandlePointerdown, onHandleKeydown } = useSortable({
  rows,
  getElement,
  labelOf: (value) => items.value.find((item) => item.id === value)?.label ?? String(value),
  announce: (event) =>
    event.kind === 'grab'
      ? `Grabbed ${event.label}.`
      : event.kind === 'move'
        ? `${event.label}, position ${event.position} of ${event.total}.`
        : event.kind === 'drop'
          ? `Dropped ${event.label}.`
          : `Reorder cancelled.`,
  onCommit: (value, to) => {
    const from = items.value.findIndex((item) => item.id === value)
    if (from === -1) return
    const next = [...items.value]
    const [moved] = next.splice(from, 1)
    next.splice(Math.min(Math.max(to.index, 0), next.length), 0, moved!)
    items.value = next
  },
})
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  inline-size: 16rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  font-size: 0.875rem;
}
.row[data-grabbed] {
  border-color: var(--ui-primary);
}
.handle {
  border: none;
  background: none;
  padding: 0;
  color: var(--ui-text-muted);
  cursor: grab;
  touch-action: none;
}
.demo-status {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
