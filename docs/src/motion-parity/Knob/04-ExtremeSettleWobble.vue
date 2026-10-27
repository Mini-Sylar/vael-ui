<template>
  <section class="demo">
    <h3>Extreme: a settle wobble on release</h3>
    <p class="note">
      Flick the knob and let go: the indicator tips past the release angle and rings back, scaled to
      how fast you were turning. <code>v-animate</code>'s <code>replay</code> plays the tilt on
      <code>change</code>, from the release angle back to rest on a spring that rings past it. A CSS
      variable turns the indicator by it, so the drag itself is never delayed.
    </p>
    <div v-animate="wobble" class="row knob-row">
      <Knob v-model="value" :min="0" :max="100" aria-label="Momentum value" @change="release" />
      <output class="demo-status">{{ value }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Knob } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const value = shallowRef(50)
const swing = shallowRef(0)
const releases = shallowRef(0)

// Each release tips the indicator by `swing` and springs it back to rest, ringing past it like
// GSAP's elastic.out(1, 0.5) over 600ms.
const wobble = computed(() => ({
  initial: { '--wobble': `${swing.value}deg` },
  replay: releases.value,
  appear: false,
  spring: { damping: 0.45, response: 0.3 },
}))

// Recent turns as degrees and time, to read the speed at release (the dial sweeps 270 degrees).
let samples: { deg: number; t: number }[] = []
watch(value, (v) => {
  samples.push({ deg: v * 2.7, t: performance.now() })
  if (samples.length > 5) samples.shift()
})

function release() {
  const first = samples[0]
  const last = samples[samples.length - 1]
  samples = []
  if (!first || !last || last.t === first.t) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const velocity = (last.deg - first.deg) / (last.t - first.t) // deg/ms
  const tilt = Math.max(-45, Math.min(45, velocity * 60))
  if (Math.abs(tilt) < 1) return
  swing.value = tilt
  releases.value++
}
</script>

<style>
/* Registered, so the tilt interpolates. */
@property --wobble {
  syntax: '<angle>';
  inherits: true;
  initial-value: 0deg;
}
</style>

<style scoped>
.knob-row {
  align-items: center;
  gap: 1.5rem;
}
/* The indicator tips about its own centre; the pivot keeps the knob's angle. */
.knob-row :deep(.ui-knob-indicator) {
  rotate: var(--wobble, 0deg);
}
</style>
