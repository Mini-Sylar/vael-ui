<template>
  <section class="demo">
    <h3>Extreme: the dot hops to the next option</h3>
    <p class="note">
      The dot is one element with a shared <code>layoutId</code>: choosing a plan removes it from
      the old circle and adds it to the new one, and <code>v-animate</code> slides it across on a
      bouncy spring. Radio's <code>checked</code> state fills the new circle with a pop and a ripple
      as it lands.
    </p>
    <RadioGroup v-model="plan">
      <div v-for="option in plans" :key="option.value" class="option">
        <Radio
          :value="option.value"
          :label="option.label"
          :description="option.description"
          :motion="landing"
        />
        <span v-if="plan === option.value" v-animate="hop" class="hop-dot" aria-hidden="true" />
      </div>
    </RadioGroup>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Radio, RadioGroup, vAnimate } from 'vael-ui'
import type { RadioMotion } from 'vael-ui'

const plans = [
  { value: 'free', label: 'Free', description: 'For trying things out' },
  { value: 'pro', label: 'Pro', description: 'For people who ship' },
  { value: 'team', label: 'Team', description: 'For everyone else too' },
]
const plan = shallowRef<string | null>('free')

// One dot, handed from circle to circle; it overshoots its new home.
const hop = { layoutId: 'plan-dot', spring: { damping: 0.5, response: 0.5 } }

// As it lands the circle pops and a ripple leaves it.
const ring = (alpha: number) =>
  `0 0 0 10px color-mix(in oklab, var(--ui-primary) ${alpha}%, transparent)`
const landing: RadioMotion = {
  states: {
    checked: {
      control: {
        scale: { value: [1.15, 1], spring: { damping: 0.4, response: 0.45 }, delay: 0.2 },
        boxShadow: {
          value: ['0 0 0 0 color-mix(in oklab, var(--ui-primary) 40%, transparent)', ring(0)],
          duration: 500,
          easing: 'var(--ui-ease-out)',
          delay: 0.2,
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
  border-radius: 9999px;
  background: var(--ui-primary-contrast);
  pointer-events: none;
}
</style>
