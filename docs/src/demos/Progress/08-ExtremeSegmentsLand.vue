<template>
  <section class="demo">
    <h3>Extreme: segments land one after another</h3>
    <p class="note">
      Each segment's value is set in turn, and the fill's own <code>motion</code> spring carries it
      there with a little overshoot. The legend counts up on a spring from
      <code>useSpringValue</code>, set at the same moment as its segment.
    </p>
    <Progress
      :value="landed"
      :max="total"
      :motion="{ spring: { damping: 0.65, response: 0.6 } }"
      label="Support tickets"
      style="max-width: 26rem"
    >
      <template #legend="{ segment, index }">
        <span class="swatch" :data-variant="segment.variant" />
        <span class="legend-label">{{ segment.label }}</span>
        <span class="legend-count">{{ Math.round(counts[index]!.value.value) }}</span>
      </template>
    </Progress>
    <div class="row">
      <Button size="sm" variant="outline" @click="land">Land again</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { Button, Progress, useSpringValue } from 'vael-ui'
import type { ProgressSegment } from 'vael-ui'

const segments: ProgressSegment[] = [
  { value: 38, label: 'Resolved', variant: 'success' },
  { value: 9, label: 'Waiting', variant: 'warning' },
  { value: 5, label: 'Escalated', variant: 'danger' },
]
const total = 60
const reached = shallowRef(segments.map(() => false))
const landed = computed(() =>
  segments.map((segment, i) => ({ ...segment, value: reached.value[i] ? segment.value : 0 })),
)
// No overshoot on a number: it should never read higher than the truth.
const counts = segments.map(() => useSpringValue(0, { damping: 1, response: 0.6 }))

let timers: ReturnType<typeof setTimeout>[] = []
function land() {
  timers.forEach(clearTimeout)
  reached.value = segments.map(() => false)
  counts.forEach((count) => count.set(0))
  // One after another: a beat for the reset, then 120 ms between segments.
  timers = segments.map((segment, i) =>
    setTimeout(
      () => {
        reached.value = reached.value.map((is, j) => is || j === i)
        counts[i]!.set(segment.value)
      },
      250 + i * 120,
    ),
  )
}

onMounted(land)
onBeforeUnmount(() => timers.forEach(clearTimeout))
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
.legend-count {
  font-variant-numeric: tabular-nums;
}
.row {
  margin-top: 0.75rem;
}
</style>
