<template>
  <section class="demo">
    <h3>Linked to the zoom</h3>
    <p class="note">
      <code>scale</code> is live, so other things follow it. A slider calls <code>zoomTo</code>, and
      the labels fade in with <code>mapRange</code> as you zoom.
    </p>
    <div ref="box" class="canvas" tabindex="0" aria-label="Zoomable map" @keydown="pz.onKeydown">
      <div class="map">
        <span
          v-for="place in places"
          :key="place.name"
          v-animate="{
            animate: {
              opacity: () => mapRange(pz.scale.value, [place.at, place.at + 0.6], [0, 1]),
            },
          }"
          class="pin"
          :style="{ insetInlineStart: `${place.x}%`, insetBlockStart: `${place.y}%` }"
        >
          {{ place.name }}
        </span>
      </div>
    </div>
    <Field :label="`Zoom ${pz.scale.value.toFixed(1)}×`" class="canvas-field">
      <Slider
        :model-value="pz.scale.value"
        :min="1"
        :max="5"
        :step="0.1"
        @update:model-value="(v) => pz.zoomTo(Number(v))"
      />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { Field, Slider, usePanZoom } from 'vael-ui'
import { mapRange, vAnimate } from 'vael-ui/motion'

// Each place shows once the zoom reaches `at`.
const places = [
  { name: 'Harbour', x: 12, y: 20, at: 1 },
  { name: 'Old town', x: 52, y: 38, at: 1 },
  { name: 'Market', x: 70, y: 66, at: 1.8 },
  { name: 'Station', x: 28, y: 72, at: 1.8 },
  { name: 'Library', x: 44, y: 54, at: 3 },
  { name: 'Bakery', x: 58, y: 47, at: 3.6 },
]
const pz = usePanZoom({ el: useTemplateRef('box'), maxScale: 5 })
</script>

<style scoped>
.canvas {
  position: relative;
  block-size: 16rem;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  cursor: grab;
}
.map {
  position: relative;
  inline-size: 100%;
  block-size: 100%;
  background:
    radial-gradient(
      circle at 20% 30%,
      color-mix(in oklch, var(--ui-primary) 22%, transparent),
      transparent 40%
    ),
    radial-gradient(
      circle at 70% 70%,
      color-mix(in oklch, var(--ui-primary) 14%, transparent),
      transparent 45%
    ),
    var(--ui-surface);
}
.pin {
  position: absolute;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}
.canvas-field {
  max-inline-size: 18rem;
}
</style>
