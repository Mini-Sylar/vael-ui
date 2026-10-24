<template>
  <section class="demo">
    <h3>Extreme: the dot hops to the next option</h3>
    <p class="note">
      The dot is one element with a shared <code>layoutId</code>: choosing a plan removes it from
      the old circle and adds it to the new one, and its <code>easing</code> moves it across with an
      overshoot. Inside it, <code>v-animate</code> keyframes throw the ball out sideways, stretch it
      in flight, squash it on landing and whiten it. Radio's <code>states.unchecked</code> pinches
      and empties the old circle; <code>states.checked</code> fills the new one as the ball lands,
      pops it and sends a ripple out.
    </p>
    <RadioGroup v-model="plan">
      <div v-for="option in plans" :key="option.value" class="option">
        <Radio
          :value="option.value"
          :label="option.label"
          :description="option.description"
          :motion="circle"
        />
        <span v-if="plan === option.value" v-animate="hop" class="hop-dot" aria-hidden="true">
          <span v-animate="ball" class="hop-ball" />
        </span>
      </div>
    </RadioGroup>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { Radio, RadioGroup, vAnimate } from 'vael-ui'
import type { RadioMotion } from 'vael-ui'

const plans = [
  { value: 'free', label: 'Free', description: 'For trying things out' },
  { value: 'pro', label: 'Pro', description: 'For people who ship' },
  { value: 'team', label: 'Team', description: 'For everyone else too' },
]
const plan = shallowRef<string | null>('free')

// Which way the ball flies (1 down, -1 up) and how far, in options. Set before it remounts.
const flight = shallowRef({ way: 1, steps: 1 })
watch(plan, (next, prev) => {
  const at = (value: string | null) => plans.findIndex((option) => option.value === value)
  const by = at(next) - at(prev)
  flight.value = { way: Math.sign(by) || 1, steps: Math.abs(by) }
})

// The page shows the chosen plan as it is; only changes after that animate.
const ready = shallowRef(false)
onMounted(() => (ready.value = true))

// One dot, handed from circle to circle: 50ms of wind-up, then GSAP's back.out(2.2) over 500ms.
const hop = {
  layoutId: 'plan-dot',
  duration: 550,
  easing:
    'linear(0, 0 9.09%, 0.242, 0.449, 0.624, 0.77, 0.887, 0.98, 1.051, 1.101, 1.133, 1.15, 1.154, 1.147, 1.132, 1.112, 1.087, 1.062, 1.039, 1.019, 1.005, 1)',
}

// The ball's length along its path every 55ms: wound up, stretched by its speed in flight (less on
// a short hop), squashed on landing at 440ms, then wobbling round. Turned to face where it's going.
const FLYING = [2, 2.2, 1.86, 1.45, 1.27, 1.17, 1.15]
const TURN = [0, 0, -3, -8, -17, -42, -56, -146, -166, -180, -180, -180, -180]
const LAND = 0.45
const ball = computed(() => {
  if (!ready.value) return {}
  const { way, steps } = flight.value
  const k = steps > 1 ? 1 : 0.57
  const long = [0.5, ...FLYING.map((l) => 1 + (l - 1) * k), 0.61, 1.23, 1.12, 0.95, 1]
  return {
    initial: {
      // After the 50ms wind-up in place, thrown out sideways, then drifting back in line as it
      // lands (GSAP's sine.inOut).
      x: {
        value: -22,
        duration: 475,
        easing:
          'linear(1, 1 10.5%, 0 10.5%, 0.024, 0.095, 0.206, 0.345, 0.5, 0.655, 0.794, 0.905, 0.976, 1)',
      },
      scale: { value: long.map((l) => `${(1 / Math.sqrt(l)).toFixed(2)} ${l}`), duration: 660 },
      rotate: { value: TURN.map((deg) => deg * way), duration: 660 },
      // In flight it's the fill color, so it shows against the page; it whitens as it lands.
      backgroundColor: {
        value: 'var(--ui-primary)',
        duration: 140,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        delay: LAND,
      },
    },
  }
})

const CUBIC_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)'
const SURFACE = ['var(--ui-surface)', 'var(--ui-border-strong)']
const PRIMARY = ['var(--ui-primary)', 'var(--ui-primary)']
// Background and border from one look to the other.
const paint = (from: string[], to: string[], timing: object) => ({
  backgroundColor: { value: [from[0]!, to[0]!], ...timing },
  borderColor: { value: [from[1]!, to[1]!], ...timing },
})
const circle: RadioMotion = {
  states: {
    // The old circle pinches as the ball leaves, then springs back empty.
    unchecked: {
      control: {
        scale: { value: [0.82, 1], duration: 400, easing: CUBIC_OUT },
        ...paint(PRIMARY, SURFACE, { duration: 220, easing: CUBIC_OUT, delay: 0.04 }),
      },
    },
    // The new one stays empty until the ball lands, then fills, pops and ripples.
    checked: {
      control: {
        ...paint(SURFACE, PRIMARY, { duration: 140, easing: CUBIC_OUT, delay: LAND }),
        // Straight up to 1.15, then GSAP's elastic.out(1, 0.4) back down to its own size.
        scale: {
          value: [1, 1.15],
          duration: 550,
          easing:
            'linear(0, 1 1%, 0.551 4.55%, 0.076, -0.21, -0.272, -0.188, -0.063, 0.031, 0.068, 0.058, 0.028, 0, -0.015, -0.016, -0.01, -0.002, 0.003, 0.004, 0.003, 0.001, 0, -0.001, 0)',
          delay: LAND,
        },
        boxShadow: {
          value: [
            '0 0 0 0 color-mix(in oklab, var(--ui-primary) 40%, transparent)',
            '0 0 0 10px color-mix(in oklab, var(--ui-primary) 0%, transparent)',
          ],
          duration: 500,
          easing: CUBIC_OUT,
          delay: LAND,
        },
      },
    },
  },
}
</script>

<style scoped>
.option {
  position: relative;
}
/* Radio's own dot gives way to the hopping one, centred on the circle. */
.option :deep(.ui-radio-dot) {
  display: none;
}
.hop-dot {
  position: absolute;
  inset-inline-start: calc((1.125rem - 0.5rem) / 2);
  inset-block-start: 50%;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  margin-block-start: -0.25rem;
  pointer-events: none;
  /* Above the options after it, or a hop upward passes under their circles. */
  z-index: 1;
}
.hop-ball {
  display: block;
  block-size: 100%;
  border-radius: 9999px;
  background: var(--ui-primary-contrast);
}
</style>
