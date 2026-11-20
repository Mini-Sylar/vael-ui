<template>
  <div style="padding: 80px">
    <Tooltip :open-delay="0">
      <template #trigger="{ setTriggerEl }">
        <span :ref="setTriggerEl" data-testid="plain-trigger" tabindex="0">Plain</span>
      </template>
      Plain tip
    </Tooltip>
    <Tooltip :open-delay="0">
      <template #trigger="{ setTriggerEl }">
        <Button :ref="setTriggerEl" data-testid="button-trigger">Button</Button>
      </template>
      Button tip
    </Tooltip>
    <Tooltip v-for="row in rows" :key="row" :open-delay="0">
      <template #trigger="{ setTriggerEl }">
        <a v-if="row" :ref="setTriggerEl" href="#" :data-testid="`row-${row}`">{{ row }}</a>
      </template>
      Row {{ row }}
    </Tooltip>
    <Tooltip :open-delay="0">
      <template #trigger="{ setTriggerEl }">
        <TooltipTriggerChild :ref="setTriggerEl">Child</TooltipTriggerChild>
      </template>
      Child tip
    </Tooltip>
  </div>
</template>

<script setup lang="ts" vapor>
import { Button, Tooltip } from 'vael-ui/vapor'
import TooltipTriggerChild from './TooltipTriggerChild.vue'

const rows = ['one', 'two']
</script>
