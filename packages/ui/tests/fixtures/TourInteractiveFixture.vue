<template>
  <output data-testid="step-index">{{ stepIndex }}</output>
  <output data-testid="state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="dialog-state">{{ dialogOpen ? 'open' : 'closed' }}</output>

  <input id="tour-input" data-testid="tour-input" aria-label="Name" />
  <button id="tour-open-dialog" data-testid="open-dialog" @click="dialogOpen = true">
    Settings
  </button>

  <Dialog v-model:open="dialogOpen" aria-label="Settings dialog">
    <p>Settings</p>
  </Dialog>

  <Tour v-model:open="open" v-model:step="stepIndex" :steps="steps" />
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Tour from '../../src/components/Tour/Tour.vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'
import type { TourStep } from '../../src/components/Tour/Tour.vue'

const open = shallowRef(true)
const stepIndex = shallowRef(0)
const dialogOpen = shallowRef(false)

const steps: TourStep[] = [
  { target: '#tour-input', title: 'Type your name' },
  { target: '#tour-open-dialog', title: 'Open settings' },
  { target: '#tour-input', title: 'Last step' },
]
</script>
