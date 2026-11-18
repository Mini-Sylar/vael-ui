<template>
  <section class="demo">
    <h3>Slides of different widths, two at a time</h3>
    <p class="note">
      <code>sizes</code> gives each slide its width, <code>align: 'start'</code> rests them against
      the left edge, <code>slidesToScroll: 2</code> moves two at a time, and
      <code>containScroll</code> stops with the last one flush, so no empty space shows. A vertical
      scroll over it still scrolls the page, and links inside still click.
    </p>
    <div
      ref="el"
      class="strip"
      tabindex="0"
      aria-roledescription="carousel"
      aria-label="Colours"
      @keydown="wheel.onKeydown"
    >
      <a
        v-for="(width, i) in widths"
        :key="i"
        class="strip-slide"
        href="#"
        :style="{ inlineSize: `${width}px`, '--hue': i * 37 }"
        @click.prevent="picked = i + 1"
      >
        {{ i + 1 }}
      </a>
    </div>
    <p class="strip-readout">Slide {{ index + 1 }} · last clicked {{ picked || 'none' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useWheel } from 'vael-ui'

const widths = [180, 120, 260, 140, 200, 160, 240, 120, 220]
const index = shallowRef(0)
const picked = shallowRef(0)
const wheel = useWheel(index, {
  el: useTemplateRef('el'),
  count: widths.length,
  sizes: widths,
  gap: 12,
  orientation: 'horizontal',
  align: 'start',
  slidesToScroll: 2,
  containScroll: true,
})
</script>

<style scoped>
.strip {
  position: relative;
  block-size: 7rem;
  overflow: hidden;
  cursor: grab;
}
/* Each slide sits at the start and moves by its own distance, mirrored right to left. */
.strip-slide {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  display: grid;
  place-items: center;
  border-radius: var(--ui-radius);
  color: white;
  font-weight: 600;
  text-decoration: none;
  background: oklch(0.55 0.15 var(--hue));
  translate: var(--ui-wheel-distance, 200vw) 0;
}
.strip-readout {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
</style>
