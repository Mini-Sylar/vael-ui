<template>
  <section class="demo">
    <h3><code>disableInteraction</code></h3>
    <p class="note">
      Per step, not tour-wide. The target goes inert like the rest of the page instead of staying
      clickable — a "look, don't touch" step.
    </p>
    <div class="row">
      <Button @click="lockedOpen = true">Start tour</Button>
    </div>
    <div class="tour-toolbar">
      <Button id="tour-locked-target" variant="outline">Don't click me mid-tour</Button>
    </div>
    <Tour v-model:open="lockedOpen" :steps="lockedSteps" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Tour } from 'vael-ui'
import type { TourStep } from 'vael-ui'

const lockedOpen = shallowRef(false)
const lockedSteps: TourStep[] = [
  {
    target: '#tour-locked-target',
    disableInteraction: true,
    title: 'Just a preview',
    description: 'This button is inert for the length of this step — clicking does nothing.',
  },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-block-end: 1rem;
}
.tour-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-block-end: 1.5rem;
}
</style>
