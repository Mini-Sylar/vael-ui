<template>
  <section class="demo">
    <h3>A looping carousel, with v-animate</h3>
    <p class="note">
      The wheel's <code>--ui-wheel-distance</code> places each card, so it holds under reduced
      motion. <code>v-animate</code> adds the tilt, scale and fade with <code>progressOf</code>.
    </p>
    <div
      ref="el"
      class="coverflow"
      tabindex="0"
      aria-roledescription="carousel"
      aria-label="Places"
      @keydown="wheel.onKeydown"
    >
      <div
        v-for="(place, i) in places"
        :key="place"
        v-animate="{ animate: look, progress: () => wheel.progressOf(i) }"
        class="coverflow-card"
        :style="{ '--hue': i * 47 }"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} of ${places.length}`"
      >
        {{ place }}
      </div>
    </div>
    <div class="coverflow-controls">
      <Button size="sm" variant="secondary" @click="wheel.step(-1)">Previous</Button>
      <output>{{ index + 1 }} / {{ places.length }}</output>
      <Button size="sm" variant="secondary" @click="wheel.step(1)">Next</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, useWheel } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const places = ['Mountains', 'Lakes', 'Forest', 'Desert', 'Coast', 'Canyon', 'Islands']
const index = shallowRef(0)
const wheel = useWheel(index, {
  el: useTemplateRef('el'),
  count: places.length,
  size: 170,
  orientation: 'horizontal',
  loop: true,
})

// One value for each place from three to the left (progress 0) to three to the right (1).
const places7 = [-3, -2, -1, 0, 1, 2, 3]
const look = {
  rotateY: places7.map((d) => d * -32),
  scale: places7.map((d) => 1 - Math.min(0.3, Math.abs(d) * 0.12)),
  opacity: places7.map((d) => 1 - Math.min(1, Math.abs(d) / 3)),
  perspective: 900,
}
</script>

<style scoped>
.coverflow {
  position: relative;
  block-size: 10rem;
  overflow: hidden;
  cursor: grab;
}
.coverflow-card {
  position: absolute;
  inset-block: 0.5rem;
  inset-inline-start: calc(50% - 90px);
  inline-size: 180px;
  display: grid;
  place-items: center;
  border-radius: var(--ui-radius);
  color: white;
  font-weight: 600;
  background: oklch(0.55 0.15 var(--hue));
  /* Where it is: the wheel writes each card's distance from the centre. */
  translate: var(--ui-wheel-distance, 200vw) 0;
}
.coverflow-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-variant-numeric: tabular-nums;
}
</style>
