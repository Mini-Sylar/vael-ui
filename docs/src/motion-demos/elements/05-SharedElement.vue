<template>
  <section class="demo">
    <h3>Shared element</h3>
    <div v-if="!selected" class="grid">
      <button
        v-for="card in cards"
        :key="card.name"
        v-animate="{ layoutId: card.name }"
        class="card"
        :style="{ background: card.color }"
        @click="selected = card"
      >
        {{ card.name }}
      </button>
    </div>
    <div v-else class="detail">
      <div
        v-animate="{ layoutId: selected.name }"
        class="hero"
        :style="{ background: selected.color }"
      >
        {{ selected.name }}
      </div>
      <Button variant="outline" @click="selected = null">Close</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, vAnimate } from 'vael-ui'

interface Card {
  name: string
  color: string
}

const cards: Card[] = [
  { name: 'Coral', color: '#f4a393' },
  { name: 'Sage', color: '#a8c5a0' },
  { name: 'Sky', color: '#9cc3e6' },
  { name: 'Amber', color: '#f0c674' },
  { name: 'Lilac', color: '#c3aee6' },
  { name: 'Mint', color: '#9fdcc8' },
]
const selected = shallowRef<Card | null>(null)
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.card {
  block-size: 4.5rem;
  border: 0;
  border-radius: var(--ui-radius);
  color: #1f2937;
  font: inherit;
  cursor: pointer;
}
.detail {
  display: grid;
  justify-items: start;
  gap: 1rem;
}
.hero {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 12rem;
  border-radius: var(--ui-radius);
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}
</style>
