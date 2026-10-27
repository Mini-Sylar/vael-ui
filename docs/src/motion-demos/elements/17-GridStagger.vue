<template>
  <section class="demo">
    <h3>Across a grid</h3>
    <div class="row">
      <SelectButton
        v-model="from"
        :items="FROM"
        :allow-empty="false"
        aria-label="Start the wave from"
        size="sm"
      />
      <Button size="sm" variant="secondary" @click="plays++">Play</Button>
    </div>
    <div class="grid">
      <!-- One name, so the tiles play together; 'center' and 'edges' go by where each sits. -->
      <span
        v-for="tile in 16"
        :key="tile"
        v-animate:tiles="{ initial: { opacity: 0, scale: '0.6' }, stagger, replay: plays }"
        class="tile"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, SelectButton } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const FROM = [
  { label: 'First', value: 'first' },
  { label: 'Center', value: 'center' },
  { label: 'Edges', value: 'edges' },
  { label: 'End', value: 'end' },
]
const from = shallowRef<'first' | 'center' | 'edges' | 'end'>('center')
// `true` is page order from the first; the words start the wave elsewhere.
const stagger = computed(() => (from.value === 'first' ? true : from.value))
const plays = shallowRef(0)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 3rem);
  gap: 0.5rem;
  margin-block-start: 1rem;
}
.tile {
  block-size: 3rem;
  border-radius: calc(var(--ui-radius) - 2px);
  background: var(--ui-text);
  opacity: 0.85;
}
</style>
