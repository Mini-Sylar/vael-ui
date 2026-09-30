<template>
  <div class="dither-area" :style="{ '--reveal-delay': `${delay}s` }" aria-hidden="true">
    <div class="dither-fill" :style="{ '--area-mask': areaMask }" />
    <svg class="dither-line" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none">
      <path v-if="secondary" :d="secondaryPaths!.line" class="dither-line-secondary" />
      <path :d="paths.line" />
    </svg>
    <span
      v-if="endDot"
      class="dither-end"
      :style="{ left: `${(paths.end.x / W) * 100}%`, top: `${(paths.end.y / H) * 100}%` }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sparkPaths } from './sparkPath'

const props = withDefaults(
  defineProps<{
    values: number[]
    /** A dashed comparison line on the same scale. */
    secondary?: number[]
    endDot?: boolean
    /** Seconds before the draw-in starts. */
    delay?: number
    /** Share of the height kept clear under the lowest point, so small swings read calm. */
    headroom?: number
  }>(),
  { secondary: undefined, endDot: false, delay: 0, headroom: 0 },
)

const W = 100
const H = 40
const PAD = 4

const range = computed(() => {
  const all = [...props.values, ...(props.secondary ?? [])]
  const min = Math.min(...all)
  const max = Math.max(...all)
  return { min: min - (max - min) * props.headroom, max }
})
const paths = computed(() => sparkPaths(props.values, W, H, PAD, range.value))
const secondaryPaths = computed(() =>
  props.secondary ? sparkPaths(props.secondary, W, H, PAD, range.value) : undefined,
)

// The area shape masks a CSS dot pattern, so the halftone dots stay round
// however far the chart stretches (an SVG pattern would stretch with it).
const areaMask = computed(() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'><path d='${paths.value.area}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})
</script>

<style scoped>
.dither-area {
  position: relative;
  inline-size: 100%;
  block-size: 100%;
  /* The theme picker's accent when one is set, else plain ink. */
  color: var(--docs-accent-ink, var(--ui-text));
  /* Draws in left to right once, as its card lands. */
  animation: dither-reveal 800ms var(--ui-ease-out) var(--reveal-delay, 0s) both;
}
@keyframes dither-reveal {
  from {
    clip-path: inset(-6px 100% -6px -6px);
  }
  to {
    clip-path: inset(-6px -6px -6px -6px);
  }
}

/* A checkerboard of round dots, fading out toward the baseline. */
.dither-fill {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle, currentColor 0.75px, transparent 1.05px) 0 0 / 4px 4px,
    radial-gradient(circle, currentColor 0.75px, transparent 1.05px) 2px 2px / 4px 4px;
  opacity: 0.55;
  mask-image: var(--area-mask), linear-gradient(black, transparent);
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  mask-composite: intersect;
}

.dither-line {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}
.dither-line path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.dither-line .dither-line-secondary {
  stroke: var(--ui-text-muted);
  stroke-width: 1.25;
  stroke-dasharray: 3 4;
  opacity: 0.7;
}

.dither-end {
  position: absolute;
  inline-size: 7px;
  block-size: 7px;
  margin: -3.5px 0 0 -3.5px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 3px var(--ui-surface);
}

@media (prefers-reduced-motion: reduce) {
  .dither-area {
    animation: none;
  }
}
</style>
