<template>
  <section class="demo">
    <h3>Single keys</h3>
    <div class="row kbd-row">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Enter</Kbd>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Kbd } from 'vael-ui'
</script>

<style scoped>
.kbd-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
</style>
