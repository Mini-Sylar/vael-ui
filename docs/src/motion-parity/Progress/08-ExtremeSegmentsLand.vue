<template>
  <section class="demo">
    <h3>Extreme: segments land one after another</h3>
    <p class="note">
      The fill's <code>initial</code> grows each segment from nothing, 120 ms after the one before,
      with a little overshoot, and each count rolls up from 0 the same way. Land again draws a new
      bar, so both play again.
    </p>
    <Progress
      :key="round"
      :value="segments"
      :max="total"
      :motion="motion"
      label="Support tickets"
      style="max-width: 26rem"
    >
      <template #legend="{ segment }">
        <span class="swatch" :data-variant="segment.variant" />
        <span class="legend-label">{{ segment.label }}</span>
        <span
          v-animate:counts="{
            initial: { '--count': 0 },
            duration: 700,
            easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
            stagger: 0.12,
          }"
          class="legend-count"
          :style="{ '--count': segment.value }"
        />
      </template>
    </Progress>
    <div class="row">
      <Button size="sm" variant="outline" @click="round++">Land again</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Progress, vAnimate } from 'vael-ui'
import type { ProgressMotion, ProgressSegment } from 'vael-ui'

const segments: ProgressSegment[] = [
  { value: 38, label: 'Resolved', variant: 'success' },
  { value: 9, label: 'Waiting', variant: 'warning' },
  { value: 5, label: 'Escalated', variant: 'danger' },
]
const total = 60
const round = shallowRef(0)

// back.out(1.4) as a spring.
const motion: ProgressMotion = {
  initial: { fill: { inlineSize: '0%' } },
  spring: { damping: 0.64, response: 0.55 },
  stagger: 0.12,
}
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
