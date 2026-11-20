<template>
  <Tooltip :open-delay="0">
    <template #trigger="{ setTriggerEl }">
      <TooltipTriggerClosed :ref="setTriggerEl">Closed</TooltipTriggerClosed>
    </template>
    Closed tip
  </Tooltip>
</template>

<script setup lang="ts" vapor>
import { Tooltip } from 'vael-ui/vapor'
import TooltipTriggerClosed from './TooltipTriggerClosed.vue'
</script>
