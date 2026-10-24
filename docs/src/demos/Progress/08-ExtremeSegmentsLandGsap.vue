<template>
  <section class="demo">
    <h3>Extreme: segments fill in one after another (GSAP)</h3>
    <p class="note">
      The exposed <code>fillEls</code> are the stacked segments. GSAP grows each one from zero to
      its share in turn, with a slight overshoot, while the <code>#legend</code> slot counts up to
      the real numbers. The demo turns off each fill's built-in width transition first, so the two
      don't conflict.
    </p>
    <Progress
      ref="bar"
      :value="segments"
      :max="total"
      label="Support tickets"
      style="max-width: 26rem"
    >
      <template #legend="{ segment, index }">
        <span class="swatch" :data-variant="segment.variant" />
        <span class="legend-label">{{ segment.label }}</span>
        <span class="legend-count">{{ Math.round(shown[index] ?? 0) }}</span>
      </template>
    </Progress>
    <div class="row">
      <Button size="sm" variant="outline" @click="land">Land again</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Button, Progress } from 'vael-ui'
import type { ProgressSegment } from 'vael-ui'

const segments: ProgressSegment[] = [
  { value: 38, label: 'Resolved', variant: 'success' },
  { value: 9, label: 'Waiting', variant: 'warning' },
  { value: 5, label: 'Escalated', variant: 'danger' },
]
const total = 60
const shown = reactive<number[]>(segments.map(() => 0))
const bar = useTemplateRef<InstanceType<typeof Progress>>('bar')

function land() {
  const fills = bar.value?.fillEls ?? []
  if (fills.length === 0) return
  gsap.killTweensOf(fills)
  for (const fill of fills) fill.style.transition = 'none'
  fills.forEach((fill, i) => {
    const share = `${(segments[i].value / total) * 100}%`
    gsap.fromTo(
      fill,
      { inlineSize: '0%' },
      { inlineSize: share, duration: 0.7, delay: i * 0.12, ease: 'back.out(1.4)' },
    )
    shown[i] = 0
    gsap.to(shown, { [i]: segments[i].value, duration: 0.7, delay: i * 0.12, ease: 'power2.out' })
  })
}

onMounted(land)
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
