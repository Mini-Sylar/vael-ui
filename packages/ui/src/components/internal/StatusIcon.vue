<template>
  <span v-if="variant === 'loading'" class="ui-loader" />
  <svg v-else-if="variant === 'success'" viewBox="0 0 16 16" width="15" height="15" fill="none">
    <path
      d="M3 8.5l3 3 7-7"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  <svg v-else-if="variant === 'error'" viewBox="0 0 16 16" width="15" height="15" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </svg>
  <svg v-else-if="variant === 'warning'" viewBox="0 0 16 16" width="15" height="15" fill="none">
    <path
      d="M8 6v3.5M8 12h.01M7.16 2.75a1 1 0 011.68 0l5.87 9.4A1 1 0 0113.87 14H2.13a1 1 0 01-.84-1.85l5.87-9.4z"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  <svg v-else-if="variant === 'info'" viewBox="0 0 16 16" width="15" height="15" fill="none">
    <path d="M8 7v4.5M8 4.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.4" />
  </svg>
</template>

<!--
  Internal, not exported from index.ts — extracted from Toaster.vue's inline
  variant SVGs (decision 2 in the plan) so Message can share the same visual
  vocabulary without pulling in any of Toaster's queue/stacking/swipe
  machinery. `default` renders nothing, matching Toaster's own prior
  behavior (no icon branch existed for it either).
-->
<script setup lang="ts">
defineProps<{
  variant: 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading'
}>()
</script>
