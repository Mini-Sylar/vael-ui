<template>
  <section class="demo">
    <h3>One value drives several looks</h3>
    <p class="note">
      <code>mapRange</code> turns one number into whatever each part needs: an angle for the needle,
      a hue for the dial, a size for the reading. Three points bend the hue from cold through warm
      to hot. Past either end, the value holds.
    </p>
    <div class="gauge" :style="{ '--hue': hue }">
      <div class="dial">
        <div class="needle" :style="{ rotate: `${angle}deg` }" />
      </div>
      <output class="reading" :style="{ fontSize: `${size}rem` }">{{ temp }}°</output>
    </div>
    <Slider v-model="temp" :min="-20" :max="60" aria-label="Temperature" class="slider" />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Slider } from 'vael-ui'
import { mapRange } from 'vael-ui/motion'

const temp = shallowRef(20)

// -20 to 60 degrees sweeps the needle across the dial.
const angle = computed(() => mapRange(temp.value, [-20, 60], [-80, 80]))
// Blue below 0, green by 20, red at 60.
const hue = computed(() => mapRange(temp.value, [-20, 20, 60], [240, 130, 10]))
// The reading grows as it gets extreme: at 20 it's 1.5rem, at either end 2.25rem.
const size = computed(() => mapRange(Math.abs(temp.value - 20), [0, 40], [1.5, 2.25]))
</script>

<style scoped>
.gauge {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.dial {
  position: relative;
  inline-size: 7rem;
  block-size: 3.75rem;
  overflow: hidden;
  border-radius: 7rem 7rem 0 0;
  background: oklch(0.85 0.12 var(--hue));
}
.needle {
  position: absolute;
  inset-inline-start: calc(50% - 1px);
  inset-block-end: 0;
  inline-size: 2px;
  block-size: 3.25rem;
  border-radius: 2px;
  background: var(--ui-text);
  transform-origin: 50% 100%;
}
.reading {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.slider {
  max-inline-size: 22rem;
  margin-block-start: 1rem;
}
</style>
