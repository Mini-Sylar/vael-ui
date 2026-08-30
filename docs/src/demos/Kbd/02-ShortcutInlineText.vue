<template>
  <section class="demo">
    <h3>A shortcut, inline with text</h3>
    <p class="note kbd-row">Press <Kbd>⌘</Kbd><Kbd>K</Kbd> to open the command palette.</p>
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
