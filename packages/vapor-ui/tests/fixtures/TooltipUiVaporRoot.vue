<template>
  <TooltipHost :ui="{ panel: { style: { '--ui-tooltip-bg': 'rgb(0, 128, 0)' } } }" />
  <button type="button" data-testid="plain" v-tooltip="'Host look'">Plain</button>
  <button
    type="button"
    data-testid="own"
    v-tooltip="{
      content: 'Own look',
      ui: { panel: { style: { '--ui-tooltip-bg': 'rgb(255, 0, 0)' } } },
    }"
  >
    Own
  </button>
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: the Vapor host must merge a target's own `ui`.
import { TooltipHost, vTooltip } from 'vael-ui/vapor'
</script>
