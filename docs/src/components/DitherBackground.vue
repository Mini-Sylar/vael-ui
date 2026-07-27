<template>
  <canvas ref="canvasEl" class="dither-canvas" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'

// Classic 4x4 ordered (Bayer) dither matrix, normalized to 0..1 — turns a
// smooth noise field into a stable, print-like pattern of on/off pixels
// instead of a muddy gray blend.
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

const CELL = 8 // px per dither cell — coarse enough to read as texture, not noise

const canvasEl = useTemplateRef<HTMLCanvasElement>('canvasEl')
let ctx: CanvasRenderingContext2D | null = null
let intervalId: ReturnType<typeof setInterval> | undefined
let cols = 0
let rows = 0
let t = 0

// Sized to the canvas's own containing block, not the viewport — this fills
// whatever section hosts it (e.g. the 404 page's content column) without
// bleeding under the sidebar, which sits in a sibling flex column.
function resize() {
  const canvas = canvasEl.value
  const parent = canvas?.parentElement
  if (!canvas || !parent) return
  const { width, height } = parent.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.ceil(width * dpr)
  canvas.height = Math.ceil(height * dpr)
  ctx?.scale(dpr, dpr)
  cols = Math.ceil(width / CELL)
  rows = Math.ceil(height / CELL)
}

// Two offset sine fields instead of true random noise: cheap, and its slow
// drift reads as a living texture rather than static TV static.
function noiseAt(x: number, y: number): number {
  const v = 0.5 + 0.25 * Math.sin(x * 0.09 + t) + 0.25 * Math.sin(y * 0.07 - t * 0.7 + x * 0.02)
  return v
}

function draw() {
  const canvas = canvasEl.value
  if (!canvas || !ctx) return
  const color = getComputedStyle(canvas).getPropertyValue('--ui-text').trim() || '#000'
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = color
  ctx.globalAlpha = 0.05
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const threshold = BAYER_4X4[y % 4]![x % 4]!
      if (noiseAt(x, y) > threshold) {
        ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1)
      }
    }
  }
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  const canvas = canvasEl.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  resize()
  draw()

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduceMotion) {
    intervalId = setInterval(() => {
      t += 0.06
      draw()
    }, 140)
  }

  if (canvas.parentElement) {
    resizeObserver = new ResizeObserver(() => {
      resize()
      draw()
    })
    resizeObserver.observe(canvas.parentElement)
  }
})

onUnmounted(() => {
  clearInterval(intervalId)
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.dither-canvas {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
