<template>
  <section class="demo">
    <h3>Extreme: a celebration burst at max rating</h3>
    <p class="note">
      Pick the top rating and the stars spin and pop one after another. Each star's
      <code>initial</code> is a list of keyframes (grow and tip, dip back, settle) with
      <code>times</code>, an easing per step and a <code>stagger</code>.
      <code>appear: false</code> keeps it still on load, and <code>replay</code> plays it each time
      you reach 5, without remounting the stars.
    </p>
    <Rating v-model="value" :max="5" :motion="motion" aria-label="Your rating" />
    <p class="demo-status">{{ value === 5 ? 'Perfect score!' : 'Rate it 5 to see the burst.' }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Rating } from 'vael-ui'
import type { RatingMotion } from 'vael-ui'

const value = shallowRef(0)
const bursts = shallowRef(0)
watch(value, (next, prev) => {
  if (next === 5 && prev !== 5) bursts.value++
})

// GSAP eases the whole burst power1.inOut, so its steps land at 196 and 272ms: in, near-straight, out.
const keys = {
  times: [0, 196 / 480, 272 / 480, 1],
  duration: 480,
  easing: [
    'cubic-bezier(0.33, 0, 0.67, 0.33)',
    'cubic-bezier(0.33, 0.3, 0.67, 0.69)',
    'cubic-bezier(0.33, 0.67, 0.67, 1)',
  ],
}
// `duration: 0` turns the built-in pop and fill sweep off; `appear: false` waits for the first 5.
const motion = computed<RatingMotion>(() => ({
  duration: 0,
  stagger: 0.05,
  appear: false,
  replay: bursts.value,
  initial: {
    item: {
      scale: { value: [1, 1.6, 0.9, 1], ...keys },
      rotate: { value: [0, -18, 12, 0], ...keys },
    },
  },
}))
</script>
