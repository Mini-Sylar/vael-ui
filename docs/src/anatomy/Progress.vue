<!-- Progress with every part: stacked segments with labels, so the legend shows. -->
<template>
  <div data-specimen class="specimen">
    <Progress :value="segments" label="Storage" value-text="72 GB of 100 GB" />
  </div>
</template>

<script setup lang="ts">
import { Progress } from 'vael-ui'

const segments = [
  { value: 38, label: 'Photos' },
  { value: 22, label: 'Documents' },
  { value: 12, label: 'Apps' },
]
</script>

<style scoped>
.specimen {
  inline-size: min(24rem, 100%);
}
</style>
