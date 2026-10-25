<template>
  <section class="demo">
    <h3>Your own animation</h3>
    <Button variant="secondary" @click="shown = !shown">{{ shown ? 'Hide' : 'Show' }}</Button>
    <div
      v-if="shown"
      v-animate="{
        enter,
        leave,
        onAfterEnter: () => (status = 'onAfterEnter: GSAP has brought it in.'),
        onAfterLeave: () => (status = 'onAfterLeave: GSAP has taken it out.'),
      }"
      class="card"
    >
      Animated by GSAP, timed by vael-ui.
    </div>
    <p class="demo-status">{{ status }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { gsap } from 'gsap'
import { Button, vAnimate } from 'vael-ui'

const shown = shallowRef(false)
const status = shallowRef('Show the card.')

// Return the tween: vael-ui waits for it, and stops it if the card leaves mid-way.
const enter = (el: HTMLElement) =>
  gsap.from(el, { y: 24, opacity: 0, rotation: -3, duration: 0.5, ease: 'back.out(2)' })
const leave = (el: HTMLElement) => gsap.to(el, { y: -12, opacity: 0, duration: 0.25 })
</script>

<style scoped>
.card {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
</style>
