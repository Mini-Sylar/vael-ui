<!-- Tags with every part: a leading icon and a label. -->
<template>
  <div data-specimen class="specimen">
    <Tag variant="success">
      <template #icon><PhCheckCircle weight="fill" /></template>
      Paid
    </Tag>
    <Tag variant="warning">
      <template #icon><PhClock weight="fill" /></template>
      Due in 3 days
    </Tag>
    <Tag>Team plan</Tag>
  </div>
</template>

<script setup lang="ts">
import { Tag } from 'vael-ui'
import { PhCheckCircle, PhClock } from '@phosphor-icons/vue'
</script>

<style scoped>
.specimen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  inline-size: min(20rem, 100%);
}
</style>
