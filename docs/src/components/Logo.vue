<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" class="vael-logo">
    <defs>
      <clipPath :id="`${uid}-circle`">
        <circle cx="16" cy="16" r="14" />
      </clipPath>
      <!-- A single orb, not four separate shapes — the dither runs across it
           as one continuous gradient, sparse to solid. Each band's dot radius
           breathes on its own cycle (different, non-multiple durations), so
           which areas read as sparse vs. dense keeps drifting instead of
           sitting in one fixed arrangement forever. -->
      <pattern :id="`${uid}-d1`" patternUnits="userSpaceOnUse" width="4.6" height="4.6">
        <circle cx="1.15" cy="1.15" r="0.55" fill="currentColor">
          <animate
            attributeName="r"
            values="0.4;0.65;0.45;0.6;0.4"
            dur="6.2s"
            repeatCount="indefinite"
          />
        </circle>
      </pattern>
      <pattern :id="`${uid}-d2`" patternUnits="userSpaceOnUse" width="3.4" height="3.4">
        <circle cx="0.85" cy="0.85" r="0.62" fill="currentColor">
          <animate
            attributeName="r"
            values="0.5;0.75;0.55;0.7;0.5"
            dur="4.7s"
            repeatCount="indefinite"
          />
        </circle>
      </pattern>
      <pattern :id="`${uid}-d3`" patternUnits="userSpaceOnUse" width="2.5" height="2.5">
        <circle cx="0.625" cy="0.625" r="0.68" fill="currentColor">
          <animate
            attributeName="r"
            values="0.58;0.8;0.62;0.76;0.58"
            dur="5.5s"
            repeatCount="indefinite"
          />
        </circle>
      </pattern>
      <pattern :id="`${uid}-d4`" patternUnits="userSpaceOnUse" width="1.8" height="1.8">
        <circle cx="0.45" cy="0.45" r="0.75" fill="currentColor">
          <animate
            attributeName="r"
            values="0.66;0.86;0.7;0.82;0.66"
            dur="3.9s"
            repeatCount="indefinite"
          />
        </circle>
      </pattern>
    </defs>
    <g :clip-path="`url(#${uid}-circle)`">
      <rect x="2" y="2" width="7" height="28" :fill="`url(#${uid}-d1)`" />
      <rect x="9" y="2" width="7" height="28" :fill="`url(#${uid}-d2)`" />
      <rect x="16" y="2" width="7" height="28" :fill="`url(#${uid}-d3)`" />
      <rect x="23" y="2" width="7" height="28" :fill="`url(#${uid}-d4)`" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { useId } from 'vue'

withDefaults(defineProps<{ size?: number }>(), { size: 24 })

const uid = `vael-logo-${useId()}`
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
