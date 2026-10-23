<template>
  <section class="demo">
    <h3>Appear and leave</h3>
    <div class="row">
      <Button @click="add">Add</Button>
      <Button variant="outline" :disabled="!orders.length" @click="orders.pop()">Remove</Button>
    </div>
    <div class="list">
      <article
        v-for="order in orders"
        :key="order"
        v-animate="{ initial: { opacity: 0, y: 12 } }"
        class="card"
      >
        Order #{{ order }}
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowReactive } from 'vue'
import { Button, vAnimate } from 'vael-ui'

const orders = shallowReactive([1042, 1043])
const add = () => orders.push((orders.at(-1) ?? 1041) + 1)
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  margin-block-end: 1rem;
}
.list {
  display: grid;
  gap: 0.5rem;
}
.card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
</style>
