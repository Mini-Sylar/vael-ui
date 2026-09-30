<template>
  <span ref="root" class="vapor-word" :data-paused="paused || undefined">
    <span class="vapor-word-text" :style="{ filter: `url(#${filterId})` }">{{ text }}</span>
    <svg ref="svg" class="vapor-word-defs" aria-hidden="true" focusable="false">
      <filter :id="filterId" x="-10%" y="-40%" width="120%" height="180%">
        <!-- Slowly morphing fractal noise, stretched vertically like rising heat. -->
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.006 0.03"
          numOctaves="1"
          seed="7"
          result="rawNoise"
        >
          <animate
            attributeName="baseFrequency"
            dur="9s"
            values="0.006 0.03; 0.009 0.045; 0.006 0.03"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <!-- Blurred noise bends the letters smoothly instead of tearing their edges. -->
        <feGaussianBlur in="rawNoise" stdDeviation="3" result="noise" />
        <!-- The letters themselves waver... -->
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="4"
          xChannelSelector="R"
          yChannelSelector="G"
          result="warped"
        >
          <animate attributeName="scale" dur="6s" values="2;5;2" repeatCount="indefinite" />
        </feDisplacementMap>
        <!-- ...and give off a faint haze of the same shape. -->
        <feGaussianBlur in="warped" stdDeviation="5" result="haze" />
        <feComponentTransfer in="haze" result="faintHaze">
          <feFuncA type="linear" slope="0.3" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="faintHaze" />
          <feMergeNode in="warped" />
        </feMerge>
      </filter>
    </svg>
  </span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef } from 'vue'

defineProps<{ text: string }>()

const filterId = `vapor-${useId()}`

// The noise only animates while the headline is on screen.
const root = useTemplateRef<HTMLElement>('root')
const svg = useTemplateRef<SVGSVGElement>('svg')
const paused = shallowRef(false)
let observer: IntersectionObserver | undefined
onMounted(() => {
  // Reduced motion keeps the vapor look but freezes it.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) svg.value?.pauseAnimations()
  if (reduce || !root.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => {
    paused.value = !entry?.isIntersecting
    if (paused.value) svg.value?.pauseAnimations()
    else svg.value?.unpauseAnimations()
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
/* Condenses out of vapor once, on load. On the wrapper, so this blur doesn't
   replace the text's own vapor filter. */
.vapor-word {
  position: relative;
  display: inline-block;
  animation: vapor-condense 900ms var(--ui-ease-out) 150ms both;
}
@keyframes vapor-condense {
  from {
    opacity: 0;
    filter: blur(8px);
    letter-spacing: 0.08em;
    translate: 0 0.12em;
  }
}
/* Smoke inside the letters: a tileable fractal-noise mask (stitched, so it
   repeats seamlessly) drifts upward one tile per loop, on top of the wavy filter.
   A solid second layer keeps every stroke at least ~50% opaque. */
.vapor-word-text {
  --vapor-tile: 150px;
  display: inline-block;
  /* Room for the haze, so the mask's box doesn't cut it off in a hard edge. */
  padding: 0.25em 0.2em;
  margin: -0.25em -0.2em;
  mask-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012 0.03' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.6 0 0 0 -0.35'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
    linear-gradient(rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.5));
  mask-size:
    var(--vapor-tile) var(--vapor-tile),
    100% 100%;
  mask-repeat: repeat, no-repeat;
  mask-composite: add;
  animation: vapor-drift 9s linear infinite;
}
@keyframes vapor-drift {
  from {
    mask-position:
      0 0,
      0 0;
  }
  to {
    mask-position:
      0 calc(var(--vapor-tile) * -1),
      0 0;
  }
}
.vapor-word[data-paused] .vapor-word-text {
  animation-play-state: paused;
}
.vapor-word-defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .vapor-word,
  .vapor-word-text {
    animation: none;
  }
}
</style>
