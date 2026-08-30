<template>
  <section class="demo">
    <h3>Extreme: fully custom enter/exit via GSAP (gsap)</h3>
    <p class="note">
      <code>:motion-css="false"</code> turns off Timeline's own enter/leave transition entirely and
      hands the raw element + a <code>done()</code> callback to <code>@item-enter</code>/
      <code>@item-leave</code> instead — a new event spins and flies each step in from off-screen, a
      removed one gets sucked into the marker column it's leaving.
    </p>
    <Timeline
      :items="events"
      :motion-css="false"
      :item-key="(e) => e.id"
      @item-enter="onEnter"
      @item-leave="onLeave"
    >
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

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

function onEnter(el: Element, done: () => void) {
  if (reduce()) return done()
  gsap.fromTo(
    el,
    { opacity: 0, x: -40, rotate: -8 },
    { opacity: 1, x: 0, rotate: 0, duration: 0.4, ease: 'back.out(1.7)', onComplete: done },
  )
}
function onLeave(el: Element, done: () => void) {
  if (reduce()) return done()
  gsap.to(el, {
    opacity: 0,
    scale: 0.4,
    x: -24,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: done,
  })
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
