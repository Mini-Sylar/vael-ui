<template>
  <section class="demo">
    <h3>List</h3>
    <div class="row">
      <SelectButton v-model="leaving" :items="modes" aria-label="Leaving" />
      <Button @click="add">Add</Button>
      <Button variant="secondary" :disabled="!steps.length" @click="steps.shift()">Remove</Button>
    </div>
    <Timeline :items="steps" :item-key="(step) => step.id" :motion="motion">
      <template #item="{ item }">{{ item.title }}</template>
    </Timeline>
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

// Each step keeps its own id, so the one you remove is the one that leaves.
let next = 0
const steps = reactive(['Brief', 'Design', 'Build'].map((title) => ({ id: next++, title })))
function add() {
  steps.push({ id: next, title: `Step ${++next}` })
}

// Exaggerated so you can see it: items swing in from the side on a bouncy spring, one after
// another, and leave the way they came. 'hold' keeps the rest in place until the leaver is gone.
const motion = computed<TimelineMotion>(() => ({
  initial: { item: { opacity: 0, x: -48, scale: 0.9, blur: 4 } },
  exit: { item: { opacity: 0, x: 48, scale: 0.9 } },
  spring: 'bouncy',
  stagger: 0.12,
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
