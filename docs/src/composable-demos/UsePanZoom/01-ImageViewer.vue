<template>
  <section class="demo">
    <h3>A viewer</h3>
    <p class="note">
      Drag to pan, pinch with two fingers, double tap to zoom, or hold ctrl and scroll. The buttons
      call <code>zoomBy</code> and <code>reset</code>.
    </p>
    <div
      ref="box"
      class="viewer"
      tabindex="0"
      role="group"
      aria-label="Floor plan, zoomable"
      @keydown="pz.onKeydown"
    >
      <svg class="plan" viewBox="0 0 800 500" role="img" aria-label="A floor plan with six rooms">
        <rect width="800" height="500" fill="var(--ui-surface)" />
        <g stroke="currentColor" stroke-opacity="0.14">
          <path v-for="i in 15" :key="`v${i}`" :d="`M${i * 50} 0V500`" />
          <path v-for="i in 9" :key="`h${i}`" :d="`M0 ${i * 50}H800`" />
        </g>
        <g fill="none" stroke="currentColor" stroke-width="3">
          <rect x="40" y="40" width="720" height="420" rx="6" />
          <path d="M300 40V460M300 240H760M540 240V460M40 200H300" />
        </g>
        <g fill="currentColor" font-size="22" font-weight="600" text-anchor="middle">
          <text x="170" y="125">Atrium</text>
          <text x="170" y="340">Workshop</text>
          <text x="530" y="150">Studio</text>
          <text x="420" y="355">Store</text>
          <text x="650" y="355">Office</text>
        </g>
        <g fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7">
          <text x="170" y="145">Entrance and reception</text>
          <text x="170" y="360">Benches and tools</text>
          <text x="530" y="170">Daylight, large tables</text>
          <text x="420" y="375">Shelving</text>
          <text x="650" y="375">Desks</text>
        </g>
      </svg>
    </div>
    <div class="viewer-controls">
      <Button size="sm" variant="secondary" aria-label="Zoom out" @click="pz.zoomBy(1 / 1.5)">
        −
      </Button>
      <output class="viewer-scale">{{ Math.round(pz.scale.value * 100) }}%</output>
      <Button size="sm" variant="secondary" aria-label="Zoom in" @click="pz.zoomBy(1.5)">+</Button>
      <Button size="sm" variant="ghost" :disabled="!pz.isZoomed.value" @click="pz.reset()">
        Reset
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { Button, usePanZoom } from 'vael-ui'

const pz = usePanZoom({ el: useTemplateRef('box'), maxScale: 6 })
</script>

<style scoped>
.viewer {
  position: relative;
  block-size: 18rem;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  cursor: grab;
  color: var(--ui-text);
}
.viewer:active {
  cursor: grabbing;
}
/* At its own size the plan fills the box, so scale 1 is "fit". */
.plan {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}
.viewer-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.viewer-scale {
  min-inline-size: 3.5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
