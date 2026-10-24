<template>
  <section class="demo">
    <h3>Extreme: a settle wobble on release</h3>
    <p class="note">
      Flick the knob and let go: the indicator tips past the release angle and rings back, scaled to
      how fast you were turning. <code>v-animate</code>'s <code>replay</code> plays the tilt on
      <code>change</code>, from the release angle back to rest on an elastic curve. A CSS variable
      turns the indicator by it, so the drag itself is never delayed.
    </p>
    <div v-animate="wobble" class="row knob-row">
      <Knob v-model="value" :min="0" :max="100" aria-label="Momentum value" @change="release" />
      <output class="demo-status">{{ value }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Knob, vAnimate } from 'vael-ui'

const value = shallowRef(50)
const swing = shallowRef(0)
const releases = shallowRef(0)

// GSAP's elastic.out(1, 0.5), sampled.
const ELASTIC =
  'linear(0, 0.1286, 0.2749, 0.4279, 0.5785, 0.7194, 0.8455, 0.9534, 1.0415, 1.1093, 1.1575, 1.1878, 1.2023, 1.2035, 1.1941, 1.1768, 1.154, 1.1282, 1.1011, 1.0745, 1.0496, 1.0273, 1.0082, 0.9927, 0.9807, 0.9722, 0.9668, 0.9642, 0.964, 0.9657, 0.9688, 0.9728, 0.9773, 0.9821, 0.9868, 0.9912, 0.9952, 0.9985, 1.0013, 1.0034, 1.0049, 1.0059, 1.0063, 1.0064, 1.0061, 1.0055, 1.0048, 1.004, 1.0032, 1.0023, 1.0016, 1.0009, 1.0003, 0.9998, 0.9994, 0.9991, 0.999, 0.9989, 0.9989, 0.9989, 1)'
// Each release tips the indicator by `swing` and rings it back to rest over 600ms.
const wobble = computed(() => ({
  initial: { '--wobble': `${swing.value}deg` },
  replay: releases.value,
  appear: false,
  duration: 600,
  easing: ELASTIC,
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
