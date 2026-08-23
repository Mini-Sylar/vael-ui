<template>
  <section class="demo">
    <h3>Text block, stacked lines, last one shorter</h3>
    <div class="skeleton-lines">
      <Skeleton variant="text" />
      <Skeleton variant="text" />
      <Skeleton variant="text" style="width: 60%" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Skeleton } from 'vael-ui'
</script>

<style scoped>
.skeleton-lines {
  display: grid;
  gap: 0.5rem;
  max-width: 20rem;
}
</style>
