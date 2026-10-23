<template>
  <section class="demo">
    <h3>Extreme: fully custom enter/exit via GSAP (gsap)</h3>
    <p class="note">
      A <code>motion</code> object with <code>enter</code> and <code>leave</code> hooks gets each
      step with its parts (marker, connectors, content). Return the timeline and the step waits for
      it. A new event grows the line down from the step above, pops its marker in where the line
      lands, then reveals its label. Removing one plays it in reverse, the line retracting into the
      next marker.
    </p>
    <Timeline :items="events" :motion="steps" :item-key="(e) => e.id">
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
import { gsap } from 'gsap'
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

const steps: TimelineMotion = {
  // A leaving step stays in flow and shrinks its own height, so the line retracts into a marker
  // that hasn't moved yet.
  leaving: 'hold',
  enter({ previousConnector: line, marker, content }) {
    gsap.set(marker, { scale: 0.4, opacity: 0 })
    gsap.set(content, { opacity: 0, x: 8, filter: 'blur(4px)' })
    const tl = gsap.timeline()
    if (line)
      tl.fromTo(
        line,
        { scaleY: 0, transformOrigin: '50% 0' },
        { scaleY: 1, duration: 0.3, ease: 'power3.out' },
      )
    tl.to(
      marker,
      { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.2)' },
      line ? '-=0.08' : 0,
    )
    tl.to(
      content,
      {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        duration: 0.35,
        ease: 'power2.out',
        clearProps: 'filter',
      },
      '<0.05',
    )
    return tl
  },
  leave({ item, connector: line, marker, content }) {
    const tl = gsap.timeline()
    tl.to(content, { opacity: 0, x: -8, filter: 'blur(4px)', duration: 0.2, ease: 'power2.out' }, 0)
    tl.to(marker, { scale: 0.4, opacity: 0, duration: 0.2, ease: 'power2.out' }, 0.05)
    if (line)
      tl.to(
        line,
        { scaleY: 0, transformOrigin: '50% 100%', duration: 0.25, ease: 'power3.out' },
        0.1,
      )
    tl.fromTo(
      item,
      { height: item.offsetHeight, overflow: 'hidden' },
      { height: 0, duration: 0.3, ease: 'power2.inOut' },
      0.2,
    )
    return tl
  },
}
</script>

<style scoped>
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
