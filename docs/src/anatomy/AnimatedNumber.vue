<!-- AnimatedNumber with its one part, the rolling number, in a revenue stat. -->
<template>
  <div data-specimen class="specimen">
    <span class="caption">Monthly revenue</span>
    <AnimatedNumber
      :value="48250"
      :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }"
      class="figure"
    />
    <span class="caption">Up 12% from last month</span>
  </div>
</template>

<script setup lang="ts">
import { AnimatedNumber } from 'vael-ui'
</script>

<style scoped>
.specimen {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
  inline-size: min(18rem, 100%);
}
.caption {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
.figure {
  font-size: 2.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}
</style>
