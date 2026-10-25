<template>
  <section class="demo">
    <h3>After a move</h3>
    <Button @click="shuffle">Shuffle</Button>
    <ul class="list">
      <li
        v-for="task in tasks"
        :key="task.id"
        v-animate="{ layout: true, onAfterMove: () => moved++ }"
        class="row"
      >
        {{ task.label }}
      </li>
    </ul>
    <!-- Each row runs its own onAfterMove; a row that stays put doesn't. -->
    <p class="demo-status">
      This shuffle: {{ moved }} of {{ tasks.length }} rows have moved and run onAfterMove.
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const moved = shallowRef(0)
const tasks = shallowRef([
  { id: 1, label: 'Write the changelog' },
  { id: 2, label: 'Review open pull requests' },
  { id: 3, label: 'Update the roadmap' },
  { id: 4, label: 'Plan the next sprint' },
])

function shuffle() {
  moved.value = 0
  const next = [...tasks.value]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  tasks.value = next
}
</script>

<style scoped>
.list {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}
.row {
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
</style>
