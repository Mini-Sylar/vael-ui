<template>
  <section class="demo">
    <h3>A list with ends</h3>
    <p class="note">
      Without <code>loop</code>, pulling past the first or last year gives, then springs back. Home
      and End jump to the ends, and Page Up and Page Down move a screenful.
    </p>
    <div class="wheel-row">
      <div
        ref="el"
        class="wheel"
        tabindex="0"
        role="spinbutton"
        aria-label="Year"
        :aria-valuenow="years[index]"
        :aria-valuemin="years[0]"
        :aria-valuemax="years.at(-1)"
        @keydown="wheel.onKeydown"
      >
        <div v-for="year in years" :key="year" class="wheel-item" aria-hidden="true">
          {{ year }}
        </div>
      </div>
      <output class="wheel-readout">{{ years[index] }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useWheel } from 'vael-ui'

const years = Array.from({ length: 80 }, (_, i) => 1960 + i)
const index = shallowRef(years.indexOf(2000))
const wheel = useWheel(index, { el: useTemplateRef('el'), count: years.length, size: 36 })
</script>

<style scoped>
.wheel-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.wheel {
  --row: 36px;
  position: relative;
  inline-size: 6rem;
  block-size: calc(var(--row) * 5);
  overflow: hidden;
  cursor: grab;
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  mask-image: linear-gradient(transparent, #000 30%, #000 70%, transparent);
}
/* The band behind the row it rests on (a pseudo-element, so not one of the wheel's items). */
.wheel::before {
  content: '';
  position: absolute;
  inset-inline: 0.25rem;
  inset-block-start: calc(50% - var(--row) / 2);
  block-size: var(--row);
  border-radius: calc(var(--ui-radius) - 2px);
  background: color-mix(in oklch, currentColor 8%, transparent);
}
.wheel:active {
  cursor: grabbing;
}
/* A flat list this time: rows slide by their distance in px and fade toward the edges. */
.wheel-item {
  position: absolute;
  inset-inline: 0;
  inset-block-start: calc(50% - var(--row) / 2);
  block-size: var(--row);
  display: grid;
  place-items: center;
  font-variant-numeric: tabular-nums;
  translate: 0 var(--ui-wheel-distance, 100vh);
  opacity: calc(1 - min(1, abs(var(--ui-wheel-offset, 9)) / 3));
}
.wheel-readout {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}
</style>
