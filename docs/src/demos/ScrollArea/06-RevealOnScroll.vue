<template>
  <section class="demo">
    <h3>Reveal as you scroll</h3>
    <p class="note">
      <code>v-animate</code> with <code>when: 'visible'</code> plays each card's entrance the first
      time it scrolls into view, here inside the ScrollArea's own viewport. One line per element; no
      observers to wire.
    </p>
    <ScrollArea class="reveal-area">
      <ul class="reveal-list">
        <li v-for="note in notes" :key="note.title" v-animate:cards="reveal" class="reveal-card">
          <strong>{{ note.title }}</strong>
          <span>{{ note.body }}</span>
        </li>
      </ul>
    </ScrollArea>
  </section>
</template>

<script setup lang="ts">
import { ScrollArea, vAnimate } from 'vael-ui'

const notes = [
  'Draft the outline',
  'Collect screenshots',
  'Write the intro',
  'Record the demo',
  'Edit the video',
  'Review with the team',
  'Fix the typos',
  'Schedule the post',
  'Share the link',
  'Answer the comments',
].map((title, i) => ({ title, body: `Step ${i + 1} of 10` }))

// Rises a little and fades in, once, the first time each card is seen; cards seen together stagger.
const reveal = { initial: { opacity: 0, y: 12 }, when: 'visible' as const, stagger: 0.04 }
</script>

<style scoped>
.reveal-area {
  block-size: 16rem;
  max-inline-size: 22rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.reveal-list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0.75rem;
  list-style: none;
}
.reveal-card {
  display: grid;
  gap: 0.125rem;
  padding: 0.75rem;
  border-radius: calc(var(--ui-radius) - 2px);
  background: var(--ui-muted);
  font-size: 0.875rem;
}
.reveal-card span {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
