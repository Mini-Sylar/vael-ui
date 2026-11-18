<template>
  <section class="demo">
    <h3>Stacked segments with a legend</h3>
    <Progress :value="storage" :max="256" label="Storage" style="max-width: 24rem" />

    <h3>Your own colors</h3>
    <Progress :value="budget" :max="4000" label="Budget" size="sm" style="max-width: 24rem" />

    <h3>Tooltip, size and minimum width per segment</h3>
    <Progress
      :value="day"
      :max="480"
      label="Day"
      :legend="false"
      :ui="{ track: { style: { gap: '2px', blockSize: '1rem' } } }"
      style="max-width: 24rem"
    />
  </section>
</template>

<script setup lang="ts">
import { Progress } from 'vael-ui'
import type { ProgressSegment } from 'vael-ui'

const storage: ProgressSegment[] = [
  { value: 72, label: 'Apps' },
  { value: 48, label: 'Photos' },
  { value: 30, label: 'Documents' },
  { value: 12, label: 'Other' },
]

const budget: ProgressSegment[] = [
  { value: 1800, label: 'Rent', color: 'oklch(0.62 0.17 260)' },
  { value: 900, label: 'Food', color: 'oklch(0.72 0.15 160)' },
  { value: 400, label: 'Transport', color: 'oklch(0.78 0.14 80)' },
]

const thin = { blockSize: '0.25rem', alignSelf: 'center' }
const day: ProgressSegment[] = [
  { value: 224, tooltip: 'At the depot for 3 h 44 min', variant: 'success' },
  { value: 40, tooltip: 'Driving for 40 min', variant: 'info', style: thin },
  { value: 2, tooltip: 'Stopped for 2 min', variant: 'warning', style: { minInlineSize: '6px' } },
  { value: 190, tooltip: 'At the yard for 3 h 10 min', variant: 'success' },
  { value: 24, tooltip: 'Driving for 24 min', variant: 'info', style: thin },
]
</script>
