<template>
  <section class="demo">
    <h3>Extreme: segments land one after another</h3>
    <p class="note">
      The fill's <code>initial</code> starts each segment at nothing, a beat after the one before,
      and it settles with a little overshoot. Each count rolls up from 0 with a
      <code>v-animate</code> of its own. Land again draws the bar afresh, so both play again.
    </p>
    <Progress
      :key="round"
      :value="segments"
      :max="total"
      :motion="motion"
      label="Support tickets"
      style="max-width: 26rem"
    >
      <template #legend="{ segment, index }">
        <span class="swatch" :data-variant="segment.variant" />
        <span class="legend-label">{{ segment.label }}</span>
        <span
          v-animate="countUp(index)"
          class="legend-count"
          :style="{ '--count': segment.value }"
        />
      </template>
    </Progress>
    <div class="row">
      <Button size="sm" variant="outline" @click="land">Land again</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Progress, vAnimate } from 'vael-ui'
import type { ProgressMotion, ProgressSegment, TargetMotion } from 'vael-ui'

const segments: ProgressSegment[] = [
  { value: 38, label: 'Resolved', variant: 'success' },
  { value: 9, label: 'Waiting', variant: 'warning' },
  { value: 5, label: 'Escalated', variant: 'danger' },
]
const total = 60
const STEP = 0.12

// GSAP's back.out(1.4) as a CSS easing.
const backOut = `linear(${Array.from({ length: 41 }, (_, i) => {
  const t = i / 40 - 1
  return +(1 + 2.4 * t ** 3 + 1.4 * t ** 2).toFixed(4)
}).join(', ')})`

// Each fill grows from nothing, 120 ms after the one before. Timed per value: a width isn't capped.
const grow = { duration: 700, easing: backOut }
const motion: ProgressMotion = {
  initial: {
    fill: ({ index }) => ({ inlineSize: { value: '0%', ...grow, delay: index * STEP } }),
  },
}
// The count is a CSS counter on --count: it rolls up from 0 alongside its segment.
const countUp = (index: number): TargetMotion => ({
  initial: {
    '--count': {
      value: 0,
      duration: 700,
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
      delay: index * STEP,
    },
  } as TargetMotion['initial'],
})

// A new bar mounts: both appearances play again.
const round = shallowRef(0)
const land = () => round.value++
</script>

<style scoped>
.swatch {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 9999px;
  background: var(--ui-primary);
}
.swatch[data-variant='success'] {
  background: var(--ui-success);
}
.swatch[data-variant='warning'] {
  background: var(--ui-warning);
}
.swatch[data-variant='danger'] {
  background: var(--ui-danger);
}
.legend-label {
  color: var(--ui-text);
}
@property --count {
  syntax: '<integer>';
  inherits: false;
  initial-value: 0;
}
.legend-count {
  font-variant-numeric: tabular-nums;
  counter-reset: count var(--count);
}
.legend-count::after {
  content: counter(count);
}
.row {
  margin-top: 0.75rem;
}
</style>
