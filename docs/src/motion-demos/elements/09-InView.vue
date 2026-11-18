<template>
  <section class="demo">
    <h3>While it's in view</h3>
    <p class="note">
      Scroll the page: each card rises into place once it's fully on screen, and sinks back when it
      leaves.
    </p>
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
  gap: 2.5rem;
}
/* Its own look while out of view; `inView` lifts it. */
.card {
  display: grid;
  place-items: center;
  min-height: 45vh;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  opacity: 0.2;
  translate: 0 32px;
}
</style>
