<template>
  <a ref="el" href="#" data-testid="child-trigger"><slot /></a>
</template>

<script setup lang="ts" vapor>
import { useTemplateRef } from 'vue'

// A Vapor component's ref holds only what it exposes, so it exposes its element.
const el = useTemplateRef<HTMLElement>('el')
defineExpose({ el })
</script>
