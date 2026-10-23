<template>
  <section class="demo">
    <h3>Extreme: a settle wobble on release</h3>
    <p class="note">
      Flick the knob and let go: the indicator swings past the release angle and rings back, scaled
      to how fast you were turning. <code>useSpringValue</code> holds the swing, a low-damping
      spring that is thrown at the release speed and set back to zero on <code>change</code>. A CSS
      variable adds it to the pivot's own angle, so the drag itself is never delayed. The knob's
      <code>motion</code> prop adds a spring-loaded press on the whole dial.
    </p>
    <div class="row knob-row" :style="{ '--wobble': `${wobble}deg` }">
      <Knob
        v-model="value"
        :min="0"
        :max="100"
        :motion="press"
        aria-label="Momentum value"
        @change="release"
      />
      <output class="demo-status">{{ value }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Knob, useSpringValue } from 'vael-ui'
import type { KnobMotion } from 'vael-ui'

const value = shallowRef(50)
const { value: wobble, set, jump } = useSpringValue(0, { damping: 0.3, response: 0.5 })
const press: KnobMotion = {
  states: { active: { root: { scale: { value: 1.06, spring: { damping: 0.5, response: 0.3 } } } } },
}

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
  const swing = Math.max(-45, Math.min(45, velocity * 60))
  if (Math.abs(swing) < 1) return
  jump(swing)
  set(0)
}
</script>

<style scoped>
.knob-row {
  align-items: center;
  gap: 1.5rem;
}
/* The pivot's angle plus the swing; unlayered, so it wins over the library's rule. */
.knob-row :deep(.ui-knob-indicator-pivot) {
  rotate: calc(var(--ui-knob-angle, -135deg) + var(--wobble, 0deg));
}
</style>
