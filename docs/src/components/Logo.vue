<template>
  <svg
    ref="svg"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    aria-hidden="true"
    class="vael-logo"
  >
    <!-- A halftone sphere: one dot per cell, sized by how much light reaches that point of the
         orb, with a Bayer threshold so the falloff dithers instead of fading. The light drifts
         slowly around the orb, so the dense side keeps moving. Dots taper toward the rim and the
         whole thing is clipped to the circle, so the edge reads round rather than stepped. -->
    <defs>
      <clipPath :id="clipId">
        <circle cx="16" cy="16" r="14" />
      </clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <circle
        v-for="(cell, i) in cells"
        :key="cell.key"
        :cx="cell.x"
        :cy="cell.y"
        :r="initial[i]"
        fill="currentColor"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, useId, useTemplateRef } from 'vue'

withDefaults(defineProps<{ size?: number }>(), { size: 24 })

const clipId = `vael-logo-${useId()}`

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
  /** Shrinks dots toward the edge, so the silhouette stays round. */
  rim: number
  threshold: number
}

// The grid is fixed; only the light moves.
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

// Each dot's radius for a light at `angle` around the orb.
function radii(angle: number): number[] {
  const lx = Math.cos(angle) * 0.62
  const ly = Math.sin(angle) * 0.62
  const lz = 0.78
  return cells.map((cell) => {
    const lit = Math.max(0, cell.nx * lx + cell.ny * ly + cell.nz * lz)
    // Dithered falloff: the threshold bites hardest in the half-lit band.
    const level = Math.min(1, Math.max(0, lit * 1.25 - cell.threshold * 0.3 + 0.08))
    return (0.22 + level * (PITCH * 0.5 - 0.1)) * cell.rim
  })
}
const initial = radii(-0.9)

// Every frame, straight to the dots (Vue at 20 Hz stuttered); a turn per ~40 s, paused off screen.
const svg = useTemplateRef<SVGSVGElement>('svg')
let angle = -0.9
let frame = 0
let last = 0
let observer: IntersectionObserver | undefined
let dots: Element[] = []
function tick(now: number) {
  const dt = last ? Math.min(now - last, 100) : 16
  last = now
  angle += (Math.PI * 2 * dt) / 40_000
  const next = radii(angle)
  dots.forEach((dot, i) => dot.setAttribute('r', next[i]!.toFixed(3)))
  frame = requestAnimationFrame(tick)
}
function stop() {
  cancelAnimationFrame(frame)
  frame = 0
  last = 0
}
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !svg.value) return
  dots = [...svg.value.querySelectorAll('circle[fill]')]
  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) stop()
    else if (!frame) frame = requestAnimationFrame(tick)
  })
  observer.observe(svg.value)
})
onUnmounted(() => {
  observer?.disconnect()
  stop()
})
</script>

<style scoped>
.vael-logo {
  /* No forced color — inherits from whatever wraps it, so it works equally
     against a plain background (App.vue sets --ui-primary there) and a
     colored badge (DashboardSidebar's mark sets --ui-primary-contrast). */
  color: inherit;
  flex: none;
}
</style>
