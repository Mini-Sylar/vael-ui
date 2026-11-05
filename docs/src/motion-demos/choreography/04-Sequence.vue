<template>
  <section class="demo">
    <div ref="stage" class="stage">
      <div class="card">
        <svg class="check" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
        </svg>
        <p class="title">Payment sent</p>
        <p class="detail">GHS 240.00 to Ama Mensah</p>
      </div>
    </div>
    <div class="controls">
      <Button @click="play">Play</Button>
      <Button variant="secondary" @click="run?.reverse()">Reverse</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button } from 'vael-ui'
import { useAnimate } from 'vael-ui/motion'
import type { AnimationControls } from 'vael-ui/motion'

const { animate } = useAnimate(useTemplateRef('stage'))
const run = shallowRef<AnimationControls>()

// One after another, on the app's spring; `at` overlaps a step with the one before it.
function play() {
  run.value = animate([
    ['.card', { opacity: [0, 1], scale: [0.92, 1] }, { name: 'card' }],
    ['.check path', { pathLength: [0, 1] }, { at: 'card:60%', duration: 300 }],
    ['.title', { opacity: [0, 1], y: [6, 0] }, { at: '-0.15' }],
    ['.detail', { opacity: [0, 1] }, { at: '50%' }],
  ])
}
</script>

<style scoped>
.stage {
  display: grid;
  place-items: center;
  min-block-size: 11rem;
}
.card {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  padding: 1.25rem 2rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-lg, 0.75rem);
  background: var(--ui-surface);
}
.check {
  inline-size: 2rem;
  block-size: 2rem;
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.title {
  margin: 0;
  font-weight: 600;
}
.detail {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
.controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
</style>
