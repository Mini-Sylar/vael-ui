<template>
  <section class="demo">
    <h3>Extreme: GSAP celebration burst at max rating (gsap)</h3>
    <p class="note">
      Hit the top rating and a GSAP stagger timeline spins/pops every star off the exposed
      <code>itemEls</code> array — <code>motionCss</code> is off here, so the library's own commit
      pop never fires underneath and GSAP is the only thing moving these nodes.
    </p>
    <Rating ref="ratingRef" v-model="value" :max="5" :motion-css="false" />
    <p class="note">{{ value === 5 ? 'Perfect score!' : 'Rate it 5 to see the burst.' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Rating } from 'vael-ui'

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const ratingRef = useTemplateRef<InstanceType<typeof Rating>>('ratingRef')
const value = shallowRef(0)

watch(value, (next, prev) => {
  if (next !== 5 || prev === 5 || reduce()) return
  const stars = ratingRef.value?.itemEls
  if (!stars || stars.length === 0) return
  gsap.to(stars, {
    keyframes: [
      { scale: 1.6, rotate: -18, duration: 0.16 },
      { scale: 0.9, rotate: 12, duration: 0.14 },
      { scale: 1, rotate: 0, duration: 0.18 },
    ],
    stagger: 0.05,
    ease: 'power1.inOut',
    clearProps: 'all',
  })
})
</script>
