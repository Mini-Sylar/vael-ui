<template>
  <section class="demo">
    <div v-if="shown" class="hero">
      <h4 v-animate:title="{ initial: { opacity: 0, y: 10 } }" class="title">Plan the week</h4>
      <!-- Starts halfway through the title's entrance. -->
      <p v-animate:lede="{ initial: { opacity: 0, y: 6 }, after: 'title:50%' }" class="lede">
        Four tasks, 23 hours.
      </p>
      <ul class="cards">
        <!-- One name, so they stagger; they wait for the lede to arrive. -->
        <li
          v-for="task in tasks"
          :key="task"
          v-animate:cards="{ initial: { opacity: 0, scale: 0.96 }, stagger: true, after: 'lede' }"
        >
          {{ task }}
        </li>
      </ul>
    </div>
    <Button variant="secondary" @click="replay">Play again</Button>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const tasks = ['Design review', 'API cleanup', 'Release notes', 'Bug triage']
const shown = ref(true)

// Mounting them again plays the whole page in again.
async function replay() {
  shown.value = false
  await nextTick()
  shown.value = true
}
</script>

<style scoped>
.hero {
  display: grid;
  gap: 0.25rem;
  margin-block-end: 1rem;
}
.title {
  margin: 0;
  font-size: 1.125rem;
}
.lede {
  margin: 0 0 0.5rem;
  color: var(--ui-text-muted);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.cards li {
  padding: 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-md, 0.5rem);
}
</style>
