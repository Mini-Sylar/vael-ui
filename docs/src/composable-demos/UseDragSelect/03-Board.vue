<template>
  <section class="demo">
    <h3>Cards on a board</h3>
    <p class="note">
      The cards sit inside each column's own list, so `items` names them with a selector. Draw a
      band from the empty space across columns; drag a card to reorder it.
      {{ dragSelect.selected.value.length }}
      selected.
    </p>
    <div ref="box" class="board" role="group" aria-label="Board">
      <section v-for="column in columns" :key="column.name" class="column">
        <h4>{{ column.name }}</h4>
        <div class="cards">
          <Sortable
            v-model:items="column.cards"
            item-key="id"
            label-key="title"
            handle="item"
            variant="plain"
          >
            <template #item="{ item }">
              <div class="card" :class="{ on: isSelected(item.id) }">{{ item.title }}</div>
            </template>
          </Sortable>
        </div>
      </section>
      <div
        v-if="dragSelect.isDragging.value"
        v-animate="{
          initial: { opacity: 0 },
          animate: {
            opacity: 1,
            x: () => dragSelect.x.value,
            y: () => dragSelect.y.value,
            width: () => dragSelect.width.value,
            height: () => dragSelect.height.value,
          },
          exit: { opacity: 0 },
        }"
        class="band"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { Sortable, useDragSelect } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const columns = ref([
  {
    name: 'To do',
    cards: [
      { id: 1, title: 'Write release notes' },
      { id: 2, title: 'Pick a color palette' },
      { id: 3, title: 'Draft the onboarding email' },
      { id: 4, title: 'Order team shirts' },
    ],
  },
  {
    name: 'Doing',
    cards: [
      { id: 5, title: 'Review the pricing page' },
      { id: 6, title: 'Record the product video' },
    ],
  },
  {
    name: 'Done',
    cards: [
      { id: 7, title: 'Book the venue' },
      { id: 8, title: 'Send the survey' },
      { id: 9, title: 'Update the logo files' },
    ],
  },
])
const box = useTemplateRef<HTMLElement>('box')
const dragSelect = useDragSelect({ el: box, items: '.card' })

// `selected` counts the matches in document order: the cards column by column.
const order = computed(() => columns.value.flatMap((column) => column.cards.map((card) => card.id)))
const isSelected = (id: number) => dragSelect.selected.value.some((i) => order.value[i] === id)
// A reorder moves cards to new positions, so the old selection no longer matches them.
watch(order, () => dragSelect.clear())
</script>

<style scoped>
.board {
  position: relative;
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding: 1.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.column {
  display: flex;
  flex: 1 0 11rem;
  flex-direction: column;
  min-block-size: 0;
}
h4 {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
.cards {
  max-height: 11rem;
  overflow-y: auto;
}
.card {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) * 0.7);
  background: var(--ui-bg, transparent);
  font-size: 0.8125rem;
}
.card.on {
  border-color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 14%, transparent);
}
.band {
  position: absolute;
  inset: 0 auto auto 0;
  border: 1px solid var(--ui-primary);
  border-radius: 4px;
  background: color-mix(in srgb, var(--ui-primary) 12%, transparent);
  pointer-events: none;
}
</style>
