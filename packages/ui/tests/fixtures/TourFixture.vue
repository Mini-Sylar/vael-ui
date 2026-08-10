<template>
  <button data-testid="trigger" @click="open = true">Start tour</button>
  <output data-testid="state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="step-index">{{ stepIndex }}</output>
  <output data-testid="finished">{{ finished ? 'finished' : 'not-finished' }}</output>
  <output data-testid="skipped">{{ skipped ? 'skipped' : 'not-skipped' }}</output>

  <div data-testid="target-a" id="target-a">Target A</div>
  <button data-testid="target-b" id="target-b">Target B</button>
  <div data-testid="target-c" id="target-c">Target C</div>
  <div v-if="drawerOpen" data-testid="target-d" id="target-d">Target D (behind a drawer)</div>

  <Tour
    v-model:open="open"
    v-model:step="stepIndex"
    :steps="steps"
    @finish="finished = true"
    @skip="skipped = true"
  />
</template>

<script setup lang="ts">
import { nextTick, shallowRef } from 'vue'
import Tour from '../../src/components/Tour/Tour.vue'
import type { TourStep } from '../../src/components/Tour/Tour.vue'

const open = shallowRef(false)
const stepIndex = shallowRef(0)
const finished = shallowRef(false)
const skipped = shallowRef(false)
const drawerOpen = shallowRef(false)

const steps: TourStep[] = [
  { target: '#target-a', title: 'Step A', group: 'Intro' },
  { target: '#target-b', title: 'Step B', group: 'Intro', disableInteraction: true },
  { target: '#target-c', title: 'Step C', group: 'Advanced' },
  {
    target: '#target-d',
    title: 'Step D',
    group: 'Advanced',
    onBeforeEnter: async () => {
      drawerOpen.value = true
      await nextTick()
    },
  },
]
</script>
