<template>
  <section class="demo">
    <h3>Extreme: a jelly thumb</h3>
    <p class="note">
      <code>motion</code>'s <code>duration</code> and <code>easing</code> launch the thumb fast and
      let it overshoot. <code>states.checked</code> and <code>states.unchecked</code> play once each
      way. The thumb stretches from the edge it leaves, holds and wobbles to a stop; the track
      squashes and bulges. Both are keyframes placed with <code>times</code>, with an easing for
      each step. The track's color fills in behind the thumb, and a click mid-flight turns it around
      from where it is.
    </p>
    <Switch v-model="enabled" label="Turbo mode" class="jelly" :motion="jelly" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Switch } from 'vael-ui'
import type { SwitchMotion } from 'vael-ui'

const enabled = shallowRef(false)

// GSAP's back.out(1.8): fast off the mark, a small overshoot, no swing back.
const BACK_OUT =
  'linear(0, 0.224, 0.417, 0.581, 0.718, 0.831, 0.922, 0.992, 1.043, 1.079, 1.1, 1.109, 1.109, 1.1, 1.086, 1.069, 1.05, 1.031, 1.015, 1.004, 1)'
const TRAVEL = { duration: 550, easing: BACK_OUT }

// GSAP's power2.out, the same curve as a CSS cubic-bezier.
const POWER2_OUT = 'cubic-bezier(0.33, 1, 0.67, 1)'
// GSAP's elastic.out(1.2, 0.3), sampled 80 times.
const PHASE = (0.3 / (2 * Math.PI)) * Math.asin(1 / 1.2)
const elastic = (u: number) =>
  u === 1 ? 1 : 1.2 * 2 ** (-10 * u) * Math.sin(((u - PHASE) * 2 * Math.PI) / 0.3) + 1
const ELASTIC = `linear(${Array.from({ length: 81 }, (_, i) => +elastic(i / 80).toFixed(4)).join(', ')})`
// The thumb stretches out in 120ms, holds 20ms, then wobbles back to round for 800ms.
const STRETCH = {
  times: [0, 120 / 940, 140 / 940, 1],
  duration: 940,
  easing: [POWER2_OUT, 'linear', ELASTIC],
}
// GSAP eases the track power2.out as a whole (its middle keyframe lands at 124ms) and power1.inOut per step.
const SQUASH = {
  times: [0, 124 / 600, 1],
  duration: 600,
  easing: ['cubic-bezier(0.42, 0.05, 0.46, 1)', 'cubic-bezier(0.4, 0.58, 0, 1)'],
}
// The thumb stretches from the edge it leaves; the fill's edge follows it on the thumb's timing.
const flip = (edge: string, fill: string) => ({
  thumb: {
    scale: { value: [1, '1.7 0.75', '1.7 0.75', 1], ...STRETCH },
    transformOrigin: { value: [edge, edge], duration: 940 },
  },
  track: {
    scale: { value: ['0.94 1.06', '1.04 0.97', 1], ...SQUASH },
    backgroundSize: { value: fill, ...TRAVEL },
  },
})

const jelly: SwitchMotion = {
  ...TRAVEL,
  states: { checked: flip('0% 50%', '100% 100%'), unchecked: flip('100% 50%', '0% 100%') },
}
</script>

<style scoped>
/* The "on" color is a fill painted over the "off" one, so it can sweep in behind the thumb. */
.jelly :deep(.ui-switch-track),
.jelly[data-state='checked'] :deep(.ui-switch-track) {
  border-color: transparent;
  background: linear-gradient(var(--ui-primary), var(--ui-primary)) 0 0 / 0% 100% no-repeat
    border-box var(--ui-border-strong);
}
.jelly[data-state='checked'] :deep(.ui-switch-track) {
  background-size: 100% 100%;
}
</style>
