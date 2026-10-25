<template>
  <section class="demo">
    <h3>Extreme: flick the thumb and it carries on</h3>
    <p class="note">
      Flick the thumb and let go: it overshoots past the release point and rings back, scaled to how
      fast you were moving. The value stays where you let go. Slider's own <code>motion</code> plays
      the swing on each release: <code>replay</code> runs its <code>initial</code> again, a
      <code>transform</code> on the thumb that springs back to rest. It adds to the
      <code>translate</code> Slider places the thumb with, so the drag itself is never delayed.
    </p>
    <div
      class="row slider-row"
      @pointerdown.capture="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="samples = []"
    >
      <Slider
        v-model="value"
        aria-label="Momentum value"
        :min="0"
        :max="100"
        :motion="motion"
        style="max-width: 20rem"
      />
      <output class="demo-status">{{ value }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Slider } from 'vael-ui'
import type { SliderMotion } from 'vael-ui'

const value = shallowRef(50)
// The last release; a new object each time, so equal overshoots still replay.
const release = shallowRef({ overshoot: 0 })

// Each release swings the thumb out and springs it home, ringing past like GSAP's elastic.out.
const motion = computed<SliderMotion>(() => ({
  initial: {
    thumb: {
      transform: {
        value: `translateX(${release.value.overshoot}px)`,
        spring: { damping: 0.45, response: 0.3 },
      },
    },
  },
  replay: release.value,
  appear: false,
}))

// The last few pointer samples of a thumb drag, to read the release speed from.
let samples: { x: number; t: number }[] = []
function onDown(event: PointerEvent) {
  const onThumb = (event.target as Element).closest('.ui-slider-thumb')
  samples = onThumb ? [{ x: event.clientX, t: event.timeStamp }] : []
}
function onMove(event: PointerEvent) {
  if (samples.length && samples.push({ x: event.clientX, t: event.timeStamp }) > 5) samples.shift()
}
function onUp() {
  const first = samples[0]
  const last = samples[samples.length - 1]
  samples = []
  if (!first || !last || last.t === first.t) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const velocity = (last.x - first.x) / (last.t - first.t) // px/ms
  const overshoot = Math.max(-40, Math.min(40, velocity * 60))
  if (Math.abs(overshoot) >= 1) release.value = { overshoot }
}
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
