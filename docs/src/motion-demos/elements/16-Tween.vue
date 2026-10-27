<template>
  <section class="demo">
    <h3>Tween a number</h3>
    <div class="row">
      <p class="total">{{ money.format(shown) }}</p>
      <Button @click="total += 129">Add an item</Button>
      <Button variant="secondary" @click="total = 0">Empty the cart</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { useTween } from 'vael-ui/motion'

const total = shallowRef(0)
// Eases to each new total from wherever it is, on the app's spring unless you give a duration.
const shown = useTween(total, { duration: 600, easing: 'out' })
const money = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' })
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.total {
  min-inline-size: 7rem;
  margin: 0;
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
}
</style>
