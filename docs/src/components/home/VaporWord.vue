<template>
  <span ref="root" class="vapor-word">
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
import { onBeforeUnmount, onMounted, useId, useTemplateRef } from 'vue'

defineProps<{ text: string }>()

const filterId = `vapor-${useId()}`

// The noise only animates while the headline is on screen.
const root = useTemplateRef<HTMLElement>('root')
const svg = useTemplateRef<SVGSVGElement>('svg')
let observer: IntersectionObserver | undefined
onMounted(() => {
  // Reduced motion keeps the vapor look but freezes it.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) svg.value?.pauseAnimations()
  if (reduce || !root.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) svg.value?.unpauseAnimations()
    else svg.value?.pauseAnimations()
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
.vapor-word-text {
  display: inline-block;
}
.vapor-word-defs {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .vapor-word {
    animation: none;
  }
}
</style>
