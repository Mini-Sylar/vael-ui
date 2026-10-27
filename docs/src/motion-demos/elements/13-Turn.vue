<template>
  <section class="demo">
    <h3>Turn in 3D</h3>
    <button
      v-animate="{ animate: { rotateY: flipped ? 180 : 0, perspective: 800 }, spring: 'smooth' }"
      class="card"
      :aria-label="flipped ? 'Show the front' : 'Show the back'"
      @click="flipped = !flipped"
    >
      <span class="face">Front</span>
      <span class="face back">Back</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { vAnimate } from 'vael-ui/motion'

const flipped = shallowRef(false)
</script>

<style scoped>
.card {
  position: relative;
  inline-size: 12rem;
  block-size: 7rem;
  padding: 0;
  border: 0;
  background: none;
  transform-style: preserve-3d;
  cursor: pointer;
}
.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
  backface-visibility: hidden;
  font-weight: 600;
}
.back {
  transform: rotateY(180deg);
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
}
</style>
