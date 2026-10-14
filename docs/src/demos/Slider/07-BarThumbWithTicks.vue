<template>
  <section class="demo">
    <h3>Bar thumb with ticks</h3>
    <p class="note">
      Restyled with CSS, ticks drawn in the <code>#track</code> slot. The bar stretches while you
      drag it.
    </p>
    <div class="stack">
      <div class="readout">
        <span>Volume</span>
        <output>{{ volume }}</output>
      </div>
      <Slider v-model="volume" :step="10" class="bar-slider" aria-label="Volume">
        <template #track>
          <span
            v-for="tick in 11"
            :key="tick"
            class="tick"
            :style="{ left: `${(tick - 1) * 10}%` }"
          />
        </template>
      </Slider>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Slider } from 'vael-ui'

const volume = shallowRef(60)
</script>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 20rem;
}

.readout {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}

.readout output {
  color: var(--ui-text);
}

.bar-slider {
  --ui-slider-thumb-size: 4px;
  --inset: 0.75rem;
  position: relative;
  block-size: 2.5rem;
  padding-inline: var(--inset);
  border-radius: 0.625rem;
  background: var(--ui-muted);
  overflow: hidden;
}

/* The fill, drawn on the root so it runs from the root's edge to the bar. */
.bar-slider::before {
  content: '';
  position: absolute;
  inset-block: 2px;
  inset-inline-start: 2px;
  inline-size: calc(var(--inset) - 2px + var(--ui-slider-p0, 0) * (100% - 2 * var(--inset)));
  border-radius: 0.5rem;
  background: color-mix(in oklch, var(--ui-text) 12%, transparent);
}

.bar-slider :deep(.ui-slider-track) {
  block-size: 100%;
  background: transparent;
}

.bar-slider :deep(.ui-slider-fill) {
  display: none;
}

.bar-slider :deep(.ui-slider-thumb) {
  inline-size: 4px;
  block-size: 1.5rem;
  border: none;
  border-radius: 9999px;
  background: var(--ui-text);
  box-shadow: none;
  transition: scale 300ms var(--ui-ease-pop);
}

.bar-slider :deep(.ui-slider-thumb:hover) {
  scale: 1;
}

.bar-slider :deep(.ui-slider-thumb[data-active]) {
  scale: 1 1.35;
}

.tick {
  position: absolute;
  top: 50%;
  inline-size: 4px;
  block-size: 4px;
  border-radius: 50%;
  background: color-mix(in oklch, var(--ui-text) 25%, transparent);
  translate: -50% -50%;
}

@media (prefers-reduced-motion: reduce) {
  .bar-slider :deep(.ui-slider-thumb[data-active]) {
    scale: 1;
  }
}
</style>
