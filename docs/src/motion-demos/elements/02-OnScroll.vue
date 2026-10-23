<template>
  <section class="demo">
    <h3>On scroll</h3>
    <div class="box">
      <div class="grid">
        <div v-for="n in 24" :key="n" v-animate:tiles="reveal" class="tile">Photo {{ n }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { vAnimate } from 'vael-ui'

// Plays once, the first time a tile is scrolled to; tiles seen together stagger.
const reveal = { initial: { opacity: 0, y: 16 }, when: 'visible' as const, stagger: 0.05 }
</script>

<style scoped>
.box {
  block-size: 18rem;
  overflow-y: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.75rem;
}
.tile {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  border-radius: calc(var(--ui-radius) - 2px);
  background: var(--ui-muted);
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
