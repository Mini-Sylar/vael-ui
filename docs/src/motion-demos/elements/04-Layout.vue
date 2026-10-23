<template>
  <section class="demo">
    <h3>Layout</h3>
    <Button @click="shuffle">Shuffle</Button>
    <ul class="list">
      <li v-for="task in tasks" :key="task.id" v-animate="{ layout: true }" class="row">
        {{ task.label }}
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, vAnimate } from 'vael-ui'

const tasks = shallowRef([
  { id: 1, label: 'Write the changelog' },
  { id: 2, label: 'Review open pull requests' },
  { id: 3, label: 'Update the roadmap' },
  { id: 4, label: 'Plan the next sprint' },
  { id: 5, label: 'Send the weekly digest' },
])

function shuffle() {
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
  padding: 0.625rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
</style>
