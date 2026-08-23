<template>
  <section class="demo">
    <h3>Vertical, needs a sized container</h3>
    <div class="row separator-vertical-row">
      <span>Left</span>
      <Separator orientation="vertical" />
      <span>Right</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Separator } from 'vael-ui'
</script>

<style scoped>
.separator-vertical-row {
  align-items: stretch;
  block-size: 2rem;
}
</style>
