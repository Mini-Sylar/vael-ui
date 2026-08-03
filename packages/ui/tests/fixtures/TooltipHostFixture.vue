<template>
  <button v-tooltip="'Saved via directive'" data-testid="host-a">A</button>
  <button v-tooltip.right="{ content: 'Right side' }" data-testid="host-b">B</button>
  <Button v-tooltip="'On a component'" data-testid="host-component">C</Button>
  <button v-tooltip="conditionalHint" data-testid="host-conditional">D</button>
  <button data-testid="toggle-conditional-hint" @click="hasHint = !hasHint">toggle</button>
  <TooltipHost :open-delay="120" :close-delay="40" />
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import TooltipHost from '../../src/components/TooltipHost.vue'
import Button from '../../src/components/Button/Button.vue'
import { vTooltip } from '../../src/directives/vTooltip'

const hasHint = shallowRef(false)
const conditionalHint = computed(() => (hasHint.value ? 'Now has a hint' : undefined))
</script>
