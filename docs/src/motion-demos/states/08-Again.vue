<template>
  <section class="demo">
    <h3>Again</h3>
    <Rating v-model="stars" :motion="motion" aria-label="Your rating" />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Rating } from 'vael-ui'
import type { RatingMotion } from 'vael-ui'

const stars = shallowRef(3)
const bursts = shallowRef(0)
// Five stars: the stars play their entrance again, one after another.
watch(stars, (value) => value === 5 && bursts.value++)
// Only on a burst, never on load.
const motion = computed<RatingMotion>(() => ({
  initial: { item: { scale: [1, 1.5, 0.9, 1], rotate: [0, -15, 10, 0] } },
  duration: 500,
  stagger: 0.05,
  appear: false,
  replay: bursts.value,
}))
</script>
