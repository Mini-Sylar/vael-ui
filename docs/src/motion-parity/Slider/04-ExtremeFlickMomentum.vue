<template>
  <section class="demo">
    <h3>Extreme: flick the thumb and it carries on</h3>
    <p class="note">
      Flick the thumb and let go: it overshoots past the release point and rings back, scaled to how
      fast you were moving. The value stays where you let go. <code>v-animate</code>'s
      <code>replay</code> plays the swing on each release, from the overshoot back to rest on an
      elastic curve, and a CSS variable adds it to the thumb as a <code>transform</code>, separate
      from the <code>translate</code> Slider places it with, so the drag itself is never delayed.
    </p>
    <div
      v-animate="swing"
      class="row slider-row"
      @pointerdown.capture="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="history = []"
    >
      <Slider
        v-model="value"
        aria-label="Momentum value"
        :min="0"
        :max="100"
        style="max-width: 20rem"
      />
      <output class="demo-status">{{ value }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Slider, vAnimate } from 'vael-ui'

const value = shallowRef(50)
const overshoot = shallowRef(0)
const releases = shallowRef(0)

// GSAP's elastic.out(1, 0.5), sampled.
const ELASTIC =
  'linear(0, 0.1286, 0.2749, 0.4279, 0.5785, 0.7194, 0.8455, 0.9534, 1.0415, 1.1093, 1.1575, 1.1878, 1.2023, 1.2035, 1.1941, 1.1768, 1.154, 1.1282, 1.1011, 1.0745, 1.0496, 1.0273, 1.0082, 0.9927, 0.9807, 0.9722, 0.9668, 0.9642, 0.964, 0.9657, 0.9688, 0.9728, 0.9773, 0.9821, 0.9868, 0.9912, 0.9952, 0.9985, 1.0013, 1.0034, 1.0049, 1.0059, 1.0063, 1.0064, 1.0061, 1.0055, 1.0048, 1.004, 1.0032, 1.0023, 1.0016, 1.0009, 1.0003, 0.9998, 0.9994, 0.9991, 0.999, 0.9989, 0.9989, 0.9989, 1)'
// Each release swings the thumb out by `overshoot` and rings it back to rest over 600ms.
const swing = computed(() => ({
  initial: { '--swing': `${overshoot.value}px` },
  replay: releases.value,
  appear: false,
  duration: 600,
  easing: ELASTIC,
}))

// The last few pointer samples of a thumb drag, to read the release speed from.
let history: { x: number; t: number }[] = []
function onDown(event: PointerEvent) {
  const onThumb = (event.target as Element).closest('.ui-slider-thumb')
  history = onThumb ? [{ x: event.clientX, t: event.timeStamp }] : []
}
function onMove(event: PointerEvent) {
  if (!history.length) return
  history.push({ x: event.clientX, t: event.timeStamp })
  if (history.length > 5) history.shift()
}
function onUp() {
  const first = history[0]
  const last = history[history.length - 1]
  history = []
  if (!first || !last || last.t === first.t) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const velocity = (last.x - first.x) / (last.t - first.t) // px/ms
  const out = Math.max(-40, Math.min(40, velocity * 60))
  if (Math.abs(out) < 1) return
  overshoot.value = out
  releases.value++
}
</script>

<style>
/* Registered, so the swing interpolates. */
@property --swing {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}
</style>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
/* The swing rides `transform`, which composes with the thumb's own `translate`. */
.slider-row :deep(.ui-slider-thumb) {
  transform: translateX(var(--swing, 0px));
}
</style>
