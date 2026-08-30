<template>
  <section class="demo">
    <h3>Horizontal</h3>
    <ScrollArea orientation="horizontal" class="scroll-demo scroll-demo--horizontal">
      <div class="scroll-row">
        <div v-for="n in 12" :key="n" class="scroll-card">Card {{ n }}</div>
      </div>
    </ScrollArea>
  </section>
</template>

<script setup lang="ts">
import { ScrollArea } from 'vael-ui'
</script>

<style scoped>
.scroll-demo {
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  margin-block-end: 1.5rem;
}
.scroll-demo--horizontal {
  inline-size: 100%;
  max-inline-size: 36rem;
}
.scroll-row {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
}
.scroll-card {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 6rem;
  block-size: 4rem;
  border-radius: calc(var(--ui-radius) - 4px);
  background: var(--ui-muted);
  font-size: 0.8125rem;
  font-weight: 500;
}
</style>
