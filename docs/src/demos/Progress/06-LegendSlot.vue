<template>
  <section class="demo">
    <h3>Legend rows of your own</h3>
    <Progress :value="quota" :max="1000" label="Message quota" style="max-width: 24rem">
      <template #legend="{ segment }">
        <span class="quota-label">{{ segment.label }}</span>
        <Tag size="sm">{{ segment.value }} / 1000</Tag>
      </template>
    </Progress>
  </section>
</template>

<script setup lang="ts">
import { Progress, Tag } from 'vael-ui'
import type { ProgressSegment } from 'vael-ui'

const quota: ProgressSegment[] = [
  { value: 620, label: 'Sent', variant: 'success' },
  { value: 140, label: 'Scheduled', variant: 'info' },
  { value: 35, label: 'Bounced', variant: 'danger' },
]
</script>

<style scoped>
.quota-label {
  color: var(--ui-text);
}
</style>
