<template>
  <section class="demo">
    <h3>Extreme: your own swap, a slot-machine drop (GSAP)</h3>
    <p class="note">
      With <code>:motion="false"</code>, AnimatedText swaps at once and the animation is yours. Here
      GSAP animates the exposed <code>el</code>: each new word drops in from above with a small
      bounce, then squashes as it stops.
    </p>
    <p class="line">
      Ship it on
      <AnimatedText ref="word" :value="days[index]!" :motion="false" class="word" />
    </p>
    <Button variant="secondary" size="sm" @click="spin">Spin</Button>
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { AnimatedText, Button } from 'vael-ui'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const index = shallowRef(4)
const word = useTemplateRef('word')

async function spin() {
  index.value = (index.value + 1 + Math.floor(Math.random() * 3)) % days.length
  await nextTick()
  const el = word.value?.el
  if (!el) return
  gsap
    .timeline()
    .fromTo(
      el,
      { yPercent: -80, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.35, ease: 'back.out(2.5)' },
    )
    .fromTo(
      el,
      { scaleY: 0.85, scaleX: 1.08 },
      { scaleY: 1, scaleX: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' },
      '-=0.1',
    )
}
</script>

<style scoped>
.line {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  font-weight: 600;
}
.word {
  color: var(--ui-primary);
  transform-origin: bottom;
}
</style>
