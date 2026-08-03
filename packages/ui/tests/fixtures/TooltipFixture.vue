<template>
  <button ref="aRef" data-testid="trigger-a">A</button>
  <Tooltip :trigger-el="aRef" :open-delay="120" :close-delay="40">
    <span data-testid="tip-a">Tooltip A</span>
  </Tooltip>

  <button ref="bRef" data-testid="trigger-b">B</button>
  <Tooltip :trigger-el="bRef" :open-delay="120" :close-delay="40">
    <span data-testid="tip-b">Tooltip B</span>
  </Tooltip>

  <button data-testid="plain">plain</button>

  <Tooltip :open-delay="120" :close-delay="40">
    <template #trigger="{ setTriggerEl }">
      <Button :ref="setTriggerEl" data-testid="trigger-slot">Slot</Button>
    </template>
    <span data-testid="tip-slot">Tooltip via slot</span>
  </Tooltip>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import Tooltip from '../../src/components/Tooltip.vue'
import Button from '../../src/components/Button/Button.vue'

const aRef = useTemplateRef('aRef')
const bRef = useTemplateRef('bRef')
</script>
