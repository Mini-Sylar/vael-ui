<template>
  <Dock :items="dockItems" tooltips />
  <Popover v-model:open="open">
    <template #trigger="{ setTriggerEl }">
      <button
        type="button"
        data-testid="directives-popover-trigger"
        :ref="setTriggerEl"
        @click="open = !open"
      >
        Open
      </button>
    </template>
    <div data-testid="directives-popover-scroll">
      <p v-for="n in 200" :key="n">Line {{ n }}</p>
    </div>
  </Popover>
  <TooltipHost />
</template>

<script setup lang="ts" vapor>
// Real-component interactive verification, not just "did it render": Dock's
// v-tooltip should actually register a target (TOOLTIP_ATTR + tooltipTargets),
// and Popover's v-scroll-mask should toggle the scroll-fade class based on
// real overflow — both through the BUILT dist bundle, no interop plugin.
import { shallowRef } from 'vue'
import { Dock, Popover, TooltipHost } from 'vael-ui/vapor'

const dockItems = [
  { label: 'Finder', value: 'finder' },
  { label: 'Mail', value: 'mail' },
]
const open = shallowRef(false)
</script>
