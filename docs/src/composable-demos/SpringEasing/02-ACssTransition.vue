<template>
  <section class="demo">
    <h3>The same spring in a CSS transition</h3>
    <p class="note">
      The result also drops into a plain <code>transition</code>: set the duration and easing as
      properties and flip a class. A drawer, a card or a toggle then moves on the same spring as
      vael-ui's own components. Open and close it quickly: a CSS transition turns around from where
      it is.
    </p>
    <Button size="sm" @click="open = !open">{{ open ? 'Close' : 'Open' }} the drawer</Button>
    <div class="stage">
      <aside class="drawer" :class="{ 'drawer--open': open }" :style="motion">
        <strong>Filters</strong>
        <span>Price, rating, delivery</span>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { springEasing } from 'vael-ui/motion'

const open = shallowRef(false)
// `--duration` and `--easing` feed the `transition` below.
const spring = springEasing({ damping: 0.75, response: 0.45 })
const motion = { '--duration': `${spring.duration}ms`, '--easing': spring.easing }
</script>

<style scoped>
.stage {
  overflow: hidden;
  max-inline-size: 28rem;
  block-size: 9rem;
  margin-block-start: 0.75rem;
  border-radius: var(--ui-radius);
  background: var(--ui-muted);
}
.drawer {
  display: grid;
  align-content: center;
  gap: 0.25rem;
  inline-size: 12rem;
  block-size: 100%;
  padding-inline: 1rem;
  border-inline-end: 1px solid var(--ui-border);
  background: var(--ui-surface);
  font-size: 0.875rem;
  translate: -100% 0;
  transition: translate var(--duration) var(--easing);
}
.drawer--open {
  translate: 0 0;
}
.drawer span {
  color: var(--ui-text-muted);
}
@media (prefers-reduced-motion: reduce) {
  .drawer {
    transition-duration: 1ms;
  }
}
</style>
