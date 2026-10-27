<template>
  <section class="demo">
    <h3>While it's in view</h3>
    <p class="note">Scroll the page: each card lifts while it's fully on screen.</p>
    <div class="cards">
      <article
        v-for="card in cards"
        :key="card"
        v-animate="{
          states: { inView: { opacity: 1, y: 0 } },
          viewport: { amount: 'all' },
          spring: 'smooth',
        }"
        class="card"
      >
        {{ card }}
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { vAnimate } from 'vael-ui/motion'

const cards = ['Design review', 'API cleanup', 'Release notes']
</script>

<style scoped>
.cards {
  display: grid;
  gap: 0.75rem;
}
/* Its own look while out of view; `inView` lifts it. */
.card {
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  opacity: 0.35;
  translate: 0 12px;
}
</style>
