<template>
  <section class="demo">
    <h3>Size</h3>
    <div v-animate.size class="panel">
      <p>{{ more ? long : short }}</p>
    </div>
    <Button variant="outline" @click="more = !more">{{ more ? 'Show less' : 'Show more' }}</Button>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const more = shallowRef(false)
const short = 'Billing runs on the first of each month.'
const long =
  'Billing runs on the first of each month. Invoices are emailed to the account owner, and any unpaid balance is retried three times over the following week before the workspace is paused.'
</script>

<style scoped>
.panel {
  overflow: hidden;
  margin-block-end: 1rem;
  padding-inline: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
</style>
