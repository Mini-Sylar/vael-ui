<template>
  <section class="demo">
    <h3>Plot it with <code>stepSpring</code></h3>
    <p class="note">
      <code>stepSpring</code> is the pure integrator step behind every live spring. Feed it a state,
      a target and a time step, and it returns the next state, with no frame loop involved. Here it
      plots a move from 0 to 1 over 1.2 s for three damping values at the response you pick. The
      dashed line is the target. Response sets how fast each curve gets there, not when it ends.
    </p>
    <svg class="plot" viewBox="0 0 320 150" role="img" :aria-label="summary">
      <line class="plot-target" x1="0" :y1="y(1)" x2="320" :y2="y(1)" />
      <line class="plot-axis" x1="0" :y1="y(0)" x2="320" :y2="y(0)" />
      <path
        v-for="curve in curves"
        :key="curve.damping"
        class="plot-line"
        :class="`plot-line--${curve.tone}`"
        :d="curve.path"
      />
    </svg>
    <ul class="plot-legend">
      <li v-for="curve in curves" :key="curve.damping" :class="`plot-line--${curve.tone}`">
        Damping {{ curve.damping }}
      </li>
    </ul>
    <Field :label="`Response ${response.toFixed(2)} s`" class="plot-field">
      <Slider v-model="response" :min="0.15" :max="0.8" :step="0.05" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Field, Slider } from 'vael-ui'
import { stepSpring } from 'vael-ui/motion'

const response = shallowRef(0.35)
const DURATION = 1.2
const DT = 1 / 240

const x = (t: number) => (t / DURATION) * 320
// Leaves headroom above the target for overshoot.
const y = (value: number) => 140 - value * 95

const curves = computed(() =>
  [
    { damping: 0.3, tone: 'a' },
    { damping: 0.6, tone: 'b' },
    { damping: 1, tone: 'c' },
  ].map((curve) => {
    let state = { value: 0, velocity: 0 }
    const points = [`M0 ${y(0)}`]
    for (let t = DT; t <= DURATION; t += DT) {
      state = stepSpring(state, 1, DT, curve.damping, response.value)
      points.push(`L${x(t).toFixed(1)} ${y(state.value).toFixed(1)}`)
    }
    return { ...curve, path: points.join(' ') }
  }),
)

const summary = computed(
  () =>
    `Spring curves from 0 to 1 at a response of ${response.value.toFixed(2)} s. Damping 0.3 and 0.6 overshoot the target; damping 1 arrives without overshoot.`,
)
</script>

<style scoped>
.plot {
  display: block;
  inline-size: 100%;
  max-inline-size: 28rem;
  overflow: visible;
}
.plot-axis {
  stroke: var(--ui-border);
}
.plot-target {
  stroke: var(--ui-text-muted);
  stroke-dasharray: 4 4;
}
.plot-line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
}
.plot-line--a {
  --curve: color-mix(in oklch, var(--ui-primary) 35%, var(--ui-surface));
}
.plot-line--b {
  --curve: color-mix(in oklch, var(--ui-primary) 65%, var(--ui-surface));
}
.plot-line--c {
  --curve: var(--ui-primary);
}
path.plot-line {
  stroke: var(--curve);
}
.plot-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
.plot-legend li::before {
  content: '';
  display: inline-block;
  inline-size: 0.75rem;
  block-size: 2px;
  margin-inline-end: 0.375rem;
  vertical-align: middle;
  background: var(--curve);
}
.plot-field {
  inline-size: 14rem;
}
</style>
