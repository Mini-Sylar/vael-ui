<template>
  <section class="demo">
    <h3>Extreme: a celebration burst at max rating</h3>
    <p class="note">
      Hit the top rating and the stars pop in one after another. The stars' own
      <code>initial</code> and <code>stagger</code> play whenever the rating mounts, so reaching 5
      swaps in a burst motion and remounts it with a new <code>key</code>, giving focus back if it
      had it.
    </p>
    <Rating
      ref="ratingRef"
      :key="bursts"
      v-model="value"
      :max="5"
      :motion="motion"
      aria-label="Your rating"
    />
    <p class="demo-status">{{ value === 5 ? 'Perfect score!' : 'Rate it 5 to see the burst.' }}</p>
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { Rating } from 'vael-ui'
import type { RatingMotion } from 'vael-ui'

const ratingRef = useTemplateRef<InstanceType<typeof Rating>>('ratingRef')
const value = shallowRef(0)
const bursts = shallowRef(0)

// Plain until the burst, so the first paint stays still.
const burst: RatingMotion = {
  initial: { item: { scale: 1.6, rotate: -18 } },
  spring: { damping: 0.35, response: 0.5 },
  stagger: 0.06,
}
const motion = shallowRef<RatingMotion>(true)

watch(value, async (next, prev) => {
  if (next !== 5 || prev === 5) return
  const hadFocus = ratingRef.value?.el?.contains(document.activeElement)
  motion.value = burst
  bursts.value++
  await nextTick()
  if (hadFocus) ratingRef.value?.el?.focus()
})
</script>
