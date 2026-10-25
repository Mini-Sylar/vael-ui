<!-- Stacked notifications that spread into a list on hover, focus or tap, each card sliding to its place. -->
<template>
  <section class="demo">
    <h3>Notification stack</h3>
    <div
      v-animate.size="spring"
      class="stack"
      :data-open="open || undefined"
      tabindex="0"
      role="group"
      aria-label="Notifications"
      @pointerenter="hover(true)"
      @pointerleave="hover(false)"
      @focusin="open = true"
      @focusout="open = false"
      @click="open = !open"
    >
      <article
        v-for="(note, i) in notes"
        :key="note.title"
        v-animate="card"
        class="card"
        :style="{ '--depth': i }"
      >
        <component :is="note.icon" :size="20" />
        <div>
          <strong>{{ note.title }}</strong>
          <p>{{ note.text }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { vAnimate } from 'vael-ui/motion'
import { PhBell, PhCheckCircle, PhUsers } from '@phosphor-icons/vue'

const notes = [
  { title: 'Deploy finished', text: 'Production is live on v2.4.0.', icon: PhCheckCircle },
  { title: 'New comment', text: 'Maya replied to your review.', icon: PhBell },
  { title: 'Invite accepted', text: 'Theo joined the workspace.', icon: PhUsers },
]
const open = shallowRef(false)
// Closes a beat after the pointer leaves: a hand resting on a card's edge doesn't flicker it.
let closing: ReturnType<typeof setTimeout> | undefined
function hover(on: boolean) {
  clearTimeout(closing)
  if (on) open.value = true
  else closing = setTimeout(() => (open.value = false), 100)
}
const spring = { spring: { damping: 0.85, response: 0.32 } }
// layout: each card slides to wherever the layout puts it.
const card = { layout: true, ...spring }
</script>

<style scoped>
.demo {
  display: grid;
  justify-items: center;
  align-content: start;
  min-block-size: 18rem;
  padding-block-start: 2rem;
}
.stack {
  display: grid;
  /* Each card its own height, so the first never covers the others. */
  align-items: start;
  isolation: isolate;
  inline-size: min(20rem, 100%);
  outline: none;
}
.card {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: var(--ui-surface);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.08),
    0 4px 12px rgb(0 0 0 / 0.06);
  z-index: calc(3 - var(--depth));
  /* Stacked: each card behind the one before, a little smaller and dimmer. */
  scale: calc(1 - var(--depth) * 0.05);
  opacity: calc(1 - var(--depth) * 0.25);
  transform-origin: 50% 0;
  transition:
    scale 250ms var(--ui-ease-out),
    opacity 250ms var(--ui-ease-out);
}
.card svg {
  flex: none;
  margin-block-start: 2px;
}
.card p {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
/* Stacked, every card shares the first row; open, they flow as a list. */
.stack:not([data-open]) .card {
  grid-area: 1 / 1;
  translate: 0 calc(var(--depth) * 10px);
}
.stack[data-open] {
  gap: 0.5rem;
}
.stack[data-open] .card {
  scale: 1;
  opacity: 1;
}
</style>
