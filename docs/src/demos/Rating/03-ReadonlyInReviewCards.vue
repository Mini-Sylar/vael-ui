<template>
  <section class="demo">
    <h3>Readonly, composed into review cards</h3>
    <p class="note">
      <code>readonly</code> turns off pointer/keyboard interaction entirely, for just displaying a
      value — here paired with <code>Card</code> to show a small list of reviews.
    </p>
    <div class="row">
      <Card v-for="review in reviews" :key="review.author" :title="review.author">
        <Rating :model-value="review.stars" allow-half readonly size="sm" />
        <p class="panel-text">{{ review.text }}</p>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Card, Rating } from 'vael-ui'

const reviews = [
  { author: 'Amara O.', stars: 4.5, text: 'Exactly what our design system was missing.' },
  { author: 'Devon K.', stars: 3.5, text: 'Solid, though I wish half-stars were the default.' },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.panel-text {
  margin-block-start: 0.5rem;
}
</style>
