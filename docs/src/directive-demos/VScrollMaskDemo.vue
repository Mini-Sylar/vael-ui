<template>
  <div v-scroll-mask class="v-scroll-mask-demo">
    <p v-for="n in 12" :key="n">Line {{ n }} of a tall block of content.</p>
  </div>
</template>

<script setup lang="ts">
import { vScrollMask } from 'vael-ui'
</script>

<style scoped>
.v-scroll-mask-demo {
  max-block-size: 8rem;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  font-size: 0.875rem;
}
.v-scroll-mask-demo p {
  margin: 0.375rem 0;
}
</style>
