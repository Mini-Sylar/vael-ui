<!-- Timeline with every part: steps with dates on the opposite side, markers, connectors and content. -->
<template>
  <div data-specimen class="specimen">
    <Timeline :items="steps" :current="1">
      <template #opposite="{ item }">{{ item.date }}</template>
      <template #item="{ item }">
        <p class="title">{{ item.label }}</p>
        <p class="note">{{ item.note }}</p>
      </template>
    </Timeline>
  </div>
</template>

<script setup lang="ts">
import { Timeline } from 'vael-ui'

const steps = [
  { label: 'Order placed', note: 'Paid with Visa', date: 'Mon' },
  { label: 'Shipped', note: 'Left the warehouse', date: 'Tue' },
  { label: 'Delivered', note: 'Expected Thursday', date: 'Thu' },
]
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
.title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
}
.note {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
