<template>
  <section class="demo">
    <h3>Extreme: flick the thumb and it carries on</h3>
    <p class="note">
      Flick the thumb and let go: it overshoots past the release point and rings back, scaled to how
      fast you were moving. The value stays where you let go. <code>v-animate</code>'s
      <code>replay</code> plays the swing on each release, from the overshoot back to rest on a
      spring that rings past it, and a CSS variable adds it to the thumb as a
      <code>transform</code>, separate from the <code>translate</code> Slider places it with, so the
      drag itself is never delayed.
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

// Each release swings the thumb out by `overshoot` and springs it back to rest, ringing past it
// like GSAP's elastic.out(1, 0.5) over 600ms.
const swing = computed(() => ({
  initial: { '--swing': `${overshoot.value}px` },
  replay: releases.value,
  appear: false,
  spring: { damping: 0.45, response: 0.3 },
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
