<template>
  <button
    type="button"
    class="logo-morph"
    :aria-label="toV ? t('motionDocs.logoToOrb') : t('motionDocs.logoToV')"
    @click="toggle"
  >
    <svg ref="svg" :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true">
      <circle
        v-for="(cell, i) in cells"
        :key="cell.key"
        :cx="cell.x"
        :cy="cell.y"
        :r="orb[i]"
        fill="currentColor"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

// The logo's halftone orb, re-dithered into a V: a nod to v-motion. Each dot changes size at its
// own moment, picked by the same Bayer threshold that dithers the orb, so the shape resolves the
// way the logo is drawn instead of fading.
withDefaults(defineProps<{ size?: number }>(), { size: 160 })
const { t } = useI18n()

const RADIUS = 14
const PITCH = 2.15
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

interface Cell {
  key: string
  x: number
  y: number
  nx: number
  ny: number
  nz: number
  rim: number
  threshold: number
}
const cells: Cell[] = []
const steps = Math.floor((RADIUS * 2) / PITCH)
for (let row = 0; row <= steps; row++) {
  for (let col = 0; col <= steps; col++) {
    const x = 16 - RADIUS + PITCH / 2 + col * PITCH + (row % 2) * (PITCH / 2)
    const y = 16 - RADIUS + PITCH / 2 + row * PITCH
    const nx = (x - 16) / RADIUS
    const ny = (y - 16) / RADIUS
    const d2 = nx * nx + ny * ny
    if (d2 > 1.02) continue
    cells.push({
      key: `${row}-${col}`,
      x,
      y,
      nx,
      ny,
      nz: Math.sqrt(Math.max(0, 1 - d2)),
      rim: Math.min(1, Math.max(0.3, (1.02 - Math.sqrt(d2)) * 5)),
      threshold: BAYER[row % 4]![col % 4]!,
    })
  }
}

const big = PITCH * 0.5 - 0.1
// The orb, lit from the top left, as the header logo rests.
const orb = cells.map((cell) => {
  const lit = Math.max(0, cell.nx * -0.38 + cell.ny * -0.49 + cell.nz * 0.78)
  const level = Math.min(1, Math.max(0, lit * 1.25 - cell.threshold * 0.3 + 0.08))
  return (0.22 + level * big) * cell.rim
})
// The V: full dots along its two strokes, specks everywhere else.
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const t = Math.max(
    0,
    Math.min(
      1,
      ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2),
    ),
  )
  return Math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay))
}
const vee = cells.map((cell) => {
  const d = Math.min(
    toSegment(cell.x, cell.y, 8.5, 8.5, 16, 24),
    toSegment(cell.x, cell.y, 23.5, 8.5, 16, 24),
  )
  return d < 2.6 ? big + 0.12 : d < 3.6 ? big * 0.45 : 0.18
})

const svg = useTemplateRef<SVGSVGElement>('svg')
const toV = shallowRef(false)
let frame = 0

function morph(to: 'v' | 'orb') {
  cancelAnimationFrame(frame)
  toV.value = to === 'v'
  const dots = [...(svg.value?.querySelectorAll('circle') ?? [])]
  const from = dots.map((dot) => Number(dot.getAttribute('r')))
  const target = to === 'v' ? vee : orb
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    dots.forEach((dot, i) => dot.setAttribute('r', target[i]!.toFixed(3)))
    return
  }
  const start = performance.now()
  const TOTAL = 900
  const EACH = 360
  const step = (now: number) => {
    let moving = false
    dots.forEach((dot, i) => {
      // Its moment comes from its dither threshold, so the V resolves in the logo's own pattern.
      const begin = cells[i]!.threshold * (TOTAL - EACH)
      const p = Math.min(1, Math.max(0, (now - start - begin) / EACH))
      const eased = 1 - (1 - p) ** 3
      if (p < 1) moving = true
      dot.setAttribute('r', (from[i]! + (target[i]! - from[i]!) * eased).toFixed(3))
    })
    if (moving) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}
const toggle = () => morph(toV.value ? 'orb' : 'v')

let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => (timer = setTimeout(() => morph('v'), 700)))
onUnmounted(() => {
  clearTimeout(timer)
  cancelAnimationFrame(frame)
})
</script>

<style scoped>
.logo-morph {
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  /* The picked primary, like the header's logo. */
  color: var(--ui-primary);
  cursor: pointer;
}
.logo-morph:focus-visible {
  outline: 2px solid var(--ui-ring, var(--ui-primary));
  outline-offset: 4px;
}
</style>
