<template>
  <section class="demo">
    <h3>Timing</h3>
    <Button size="sm" @click="on = !on">{{ on ? 'Back' : 'Go' }}</Button>
    <ul class="tracks">
      <li v-for="curve in curves" :key="curve.label" class="track">
        <code>{{ curve.label }}</code>
        <span class="rail">
          <span v-animate="{ animate: { x: on ? 160 : 0 }, ...curve.timing }" class="dot" />
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import type { MotionTiming } from 'vael-ui/motion'

const on = shallowRef(false)
const curves: { label: string; timing: MotionTiming }[] = [
  { label: "spring: 'snappy'", timing: { spring: 'snappy' } },
  { label: "spring: 'smooth'", timing: { spring: 'smooth' } },
  { label: "spring: 'bouncy'", timing: { spring: 'bouncy' } },
  { label: "spring: 'gentle'", timing: { spring: 'gentle' } },
  { label: "duration: 400, easing: 'out'", timing: { duration: 400, easing: 'out' } },
]
</script>

<style scoped>
.tracks {
  display: grid;
  gap: 0.625rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}
.track {
  display: grid;
  gap: 0.25rem;
  font-size: 0.8125rem;
}
.rail {
  position: relative;
  inline-size: 11rem;
  block-size: 0.75rem;
  border-radius: 999px;
  background: var(--ui-surface-muted, color-mix(in oklab, var(--ui-text) 8%, transparent));
}
.dot {
  position: absolute;
  inset-block-start: 0;
  inline-size: 0.75rem;
  block-size: 0.75rem;
  border-radius: 999px;
  background: var(--ui-primary);
}
</style>
