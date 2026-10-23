<template>
  <section class="demo">
    <h3>Extreme: a step grows out of the line</h3>
    <p class="note">
      A <code>motion</code> object gives each step's parts their own look and timing. A new event
      grows the line down from the step above, then its marker springs in where the line lands, then
      its label settles. Removing one plays it back, and <code>leaving: 'hold'</code> keeps the gap
      until it has gone.
    </p>
    <Timeline :items="events" :motion="steps" :item-key="(e) => e.id" class="grow-line">
      <template #item="{ item }">
        <p class="event-title">{{ item.label }}</p>
      </template>
    </Timeline>
    <div class="trigger-row">
      <Button size="sm" @click="addEvent">Push event</Button>
      <Button size="sm" variant="outline" :disabled="events.length === 0" @click="removeOldest"
        >Remove oldest</Button
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Timeline } from 'vael-ui'
import type { TimelineMotion } from 'vael-ui'

interface Event {
  id: number
  label: string
}

let nextId = 3
const events = shallowRef<Event[]>([
  { id: 0, label: 'Deploy started' },
  { id: 1, label: 'Health checks passed' },
  { id: 2, label: 'Traffic shifted' },
])

function addEvent() {
  events.value = [...events.value, { id: nextId++, label: `Event ${nextId - 1}` }]
}
function removeOldest() {
  events.value = events.value.slice(1)
}

// Delays chain the parts: line first, marker where it lands, label last.
const steps: TimelineMotion = {
  leaving: 'hold',
  initial: {
    previousConnector: { scale: { value: '1 0', duration: 300, easing: 'var(--ui-ease-out)' } },
    marker: {
      scale: { value: 0.5, spring: { damping: 0.55, response: 0.4 }, delay: 0.22 },
      opacity: { value: 0, duration: 150, delay: 0.22 },
    },
    content: {
      opacity: { value: 0, delay: 0.3 },
      x: { value: 8, delay: 0.3 },
      blur: { value: 4, delay: 0.3 },
    },
  },
  exit: {
    content: {
      opacity: { value: 0, duration: 180 },
      x: { value: -8, duration: 180 },
      blur: { value: 4, duration: 180 },
    },
    marker: {
      scale: { value: 0.5, duration: 180, delay: 0.04 },
      opacity: { value: 0, duration: 180, delay: 0.04 },
    },
    connector: { scale: { value: '1 0', duration: 220, delay: 0.08 } },
  },
}
</script>

<style scoped>
/* The line grows down from the step above and retracts back up. */
.grow-line :deep(.ui-timeline-connector) {
  transform-origin: 50% 0;
}
.event-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
}
.trigger-row {
  display: flex;
  gap: 0.5rem;
  margin-block-start: 0.5rem;
}
</style>
