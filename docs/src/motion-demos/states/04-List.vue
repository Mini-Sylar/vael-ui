<template>
  <section class="demo">
    <h3>List</h3>
    <div class="row">
      <SelectButton v-model="leaving" :items="modes" aria-label="Leaving" />
      <Button @click="add">Add</Button>
      <Button variant="secondary" :disabled="!steps.length" @click="steps.shift()">Remove</Button>
    </div>
    <Timeline :items="steps" :motion="motion" />
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { Button, SelectButton, Timeline } from 'vael-ui'
import type { SelectButtonItem, TimelineMotion } from 'vael-ui'

const modes: SelectButtonItem[] = [
  { label: 'Pop', value: 'pop' },
  { label: 'Hold', value: 'hold' },
]
const leaving = shallowRef<'pop' | 'hold'>('pop')

const labels = ['Brief', 'Design', 'Build', 'Review', 'Launch']
const steps = reactive(labels.slice(0, 3).map((title) => ({ title })))
function add() {
  steps.push({ title: `Step ${steps.length + 1}` })
}

// Items rise in one after another. 'hold' keeps the rest in place until the leaver is gone.
const motion = computed<TimelineMotion>(() => ({
  initial: { item: { opacity: 0, y: 8 } },
  stagger: 0.06,
  leaving: leaving.value,
}))
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block-end: 1rem;
}
</style>
