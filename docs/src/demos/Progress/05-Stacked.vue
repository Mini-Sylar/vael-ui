<template>
  <section class="demo">
    <h3>Stacked segments with a legend</h3>
    <Progress :value="storage" :max="256" label="Storage" style="max-width: 24rem" />

    <h3>Your own colors</h3>
    <Progress :value="budget" :max="4000" label="Budget" size="sm" style="max-width: 24rem" />
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
</script>
