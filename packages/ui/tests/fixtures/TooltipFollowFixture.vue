<template>
  <div style="padding: 120px 40px">
    <div
      v-tooltip="{
        content: TooltipRichContent,
        props: { label: 'Rich' },
        follow: true,
        openDelay: 0,
      }"
      data-testid="bar"
      style="width: 300px; height: 24px; background: #ccc"
    />
    <TooltipHost />
  </div>
</template>

<script setup lang="ts">
import TooltipHost from '../../src/components/TooltipHost/TooltipHost.vue'
import { vTooltip } from '../../src/directives/vTooltip'
import TooltipRichContent from './TooltipRichContent.vue'
</script>
