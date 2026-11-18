<template>
  <Progress :value="segments" :max="100" label="Day" :legend="false" />
  <Progress :value="segments" :max="100" type="circle" label="Ring" :legend="false" />
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: a missed Vapor alias only fails at runtime.
import { Progress } from 'vael-ui/vapor'

const segments = [
  { value: 60, tooltip: 'At the depot', class: 'stop' },
  { value: 40, style: { minInlineSize: '6px' } },
]
</script>
