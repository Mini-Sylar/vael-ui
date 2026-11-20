<template>
  <button
    v-tooltip="'Delete'"
    aria-label="Delete"
    data-testid="named-icon"
    style="inline-size: 120px; block-size: 40px; display: flex; align-items: center"
  >
    <svg data-testid="named-icon-svg" width="16" height="16" aria-hidden="true">
      <rect width="16" height="16" />
    </svg>
  </button>
  <button v-tooltip="'Save the file'" data-testid="text">Save</button>
  <button v-tooltip="archiveHint" data-testid="unnamed">
    <svg width="16" height="16" aria-hidden="true"><rect width="16" height="16" /></svg>
  </button>
  <button data-testid="toggle-archive" @click="hasArchive = !hasArchive">toggle</button>
  <span v-tooltip="'Online'" data-testid="dot">●</span>
  <button data-testid="plain">plain</button>
  <button ref="closeRef" aria-label="Close" data-testid="tooltip-close">×</button>
  <Tooltip :trigger-el="closeRef" :open-delay="120" :close-delay="40">Close</Tooltip>
  <TooltipHost :open-delay="120" :close-delay="40" />
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import Tooltip from '../../src/components/Tooltip/Tooltip.vue'
import TooltipHost from '../../src/components/TooltipHost/TooltipHost.vue'
import { vTooltip } from '../../src/directives/vTooltip'

const closeRef = useTemplateRef('closeRef')
const hasArchive = shallowRef(true)
const archiveHint = computed(() => (hasArchive.value ? 'Archive' : undefined))
</script>
