<template>
  <Avatar :src :alt :name />
</template>

<script setup lang="ts">
import Avatar from '../../src/components/Avatar.vue'

// Thin passthrough so tests can drive `src` as reactive consumer-side state
// (rerender with a new src) for the image-load/error-fallback flow.
defineProps<{
  src?: string
  alt?: string
  name?: string
}>()
</script>
