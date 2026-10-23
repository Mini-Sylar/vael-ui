<template>
  <section class="demo">
    <h3>Extreme: a step grows out of the line</h3>
    <p class="note">
      A <code>motion</code> object gives each step's parts their own look and timing. A new event
      grows the line down from the step above, then its marker springs in where the line lands, then
      its label settles. Removing one plays it back, the line retracting into the next marker, and
      <code>leaving: 'hold'</code> keeps the gap until it has gone.
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

// GSAP's curves, as the original uses them.
const POWER2_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)'
const POWER3_OUT = 'cubic-bezier(0.165, 0.84, 0.44, 1)'
const POWER2_IN_OUT = 'cubic-bezier(0.645, 0.045, 0.355, 1)'
// back.out(2.2) is a cubic, so this curve is exact.
const BACK_OUT = 'cubic-bezier(0.333, 1.733, 0.667, 1)'
const fade = (delay: number) => ({ duration: 350, delay, easing: POWER2_OUT })
const pop = { duration: 400, delay: 0.22, easing: BACK_OUT }

// Delays chain the parts: line first, marker where it lands, label just after.
const steps: TimelineMotion = {
  leaving: 'hold',
  initial: {
    previousConnector: { scale: { value: '1 0', duration: 300, easing: POWER3_OUT } },
    marker: { scale: { value: 0.4, ...pop }, opacity: { value: 0, ...pop } },
    content: {
      opacity: { value: 0, ...fade(0.27) },
      x: { value: 8, ...fade(0.27) },
      blur: { value: 4, ...fade(0.27) },
    },
  },
  exit: {
    // The step folds its height away once its parts are on their way out.
    item: {
      overflow: { value: 'hidden', duration: 0 },
      height: { value: 0, duration: 300, delay: 0.2, easing: POWER2_IN_OUT },
    },
    content: {
      opacity: { value: 0, duration: 200, easing: POWER2_OUT },
      x: { value: -8, duration: 200, easing: POWER2_OUT },
      blur: { value: 4, duration: 200, easing: POWER2_OUT },
    },
    marker: {
      scale: { value: 0.4, duration: 200, delay: 0.05, easing: POWER2_OUT },
      opacity: { value: 0, duration: 200, delay: 0.05, easing: POWER2_OUT },
    },
    // The line retracts down into the next marker.
    connector: {
      transformOrigin: { value: '50% 100%', duration: 0 },
      scale: { value: '1 0', duration: 250, delay: 0.1, easing: POWER3_OUT },
    },
  },
}
</script>

<style scoped>
/* The line grows down from the step above; its exit flips the origin to retract downward. */
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
