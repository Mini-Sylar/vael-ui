<template>
  <section class="demo">
    <h3>Extreme: fully custom enter/exit via GSAP (gsap)</h3>
    <p class="note">
      <code>:motion="false"</code> turns off Timeline's own enter/leave transition entirely and
      hands the step's element, a <code>done()</code> callback and its <code>parts</code> (marker,
      connectors, content) to <code>@item-enter</code>/<code>@item-leave</code> instead. A new event
      grows the line down from the step above, pops its marker in where the line lands, then reveals
      its label. Removing one plays it in reverse, the line retracting into the next marker.
    </p>
    <Timeline
      :items="events"
      :motion="false"
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
import type { TimelineItemParts } from 'vael-ui'

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

function onEnter(_el: Element, done: () => void, parts: TimelineItemParts) {
  if (reduce()) return done()
  const { previousConnector: line, marker, content } = parts
  gsap.set(marker, { scale: 0.4, opacity: 0 })
  gsap.set(content, { opacity: 0, x: 8, filter: 'blur(4px)' })
  const tl = gsap.timeline({ onComplete: done })
  if (line) {
    tl.fromTo(
      line,
      { scaleY: 0, transformOrigin: '50% 0' },
      { scaleY: 1, duration: 0.3, ease: 'power3.out' },
    )
  }
  tl.to(marker, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.2)' }, line ? '-=0.08' : 0)
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
}

function onLeave(el: Element, done: () => void, parts: TimelineItemParts) {
  if (reduce()) return done()
  const item = el as HTMLElement
  const { connector: line, marker, content } = parts
  // The leaving item stays in flow until done(), so its height has to shrink
  // with the exit, or the list snaps shorter the moment it's removed.
  const tl = gsap.timeline({ onComplete: done })
  tl.to(content, { opacity: 0, x: -8, filter: 'blur(4px)', duration: 0.2, ease: 'power2.in' }, 0)
  tl.to(marker, { scale: 0.4, opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.05)
  if (line)
    tl.to(line, { scaleY: 0, transformOrigin: '50% 100%', duration: 0.25, ease: 'power3.in' }, 0.1)
  tl.fromTo(
    item,
    { height: item.offsetHeight, overflow: 'hidden' },
    { height: 0, duration: 0.3, ease: 'power2.inOut' },
    0.2,
  )
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
