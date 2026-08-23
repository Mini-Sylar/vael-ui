<template>
  <section class="demo">
    <h3>Variants and sizes</h3>
    <div class="progress-stack" style="max-width: 20rem">
      <Progress :value="70" variant="primary" />
      <Progress :value="70" variant="success" />
      <Progress :value="70" variant="warning" />
      <Progress :value="70" variant="danger" />
      <Progress :value="45" size="sm" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Progress } from 'vael-ui'
</script>

<style scoped>
.progress-stack {
  display: grid;
  gap: 0.75rem;
}
</style>
