<template>
  <section class="demo">
    <h3>Horizontal orientation, advancing via <code>current</code></h3>
    <p class="note">
      <code>current</code> is a plain number, not a v-model — Timeline never advances it itself.
      Bind your own ref and step it however fits your UI; <code>completed</code>/<code>active</code>
      fall out of the comparison automatically, no derivation function needed for a straight line
      like this one.
    </p>
    <Timeline :items="stages" orientation="horizontal" :current="current">
      <template #item="{ item }">
        <p class="step-title">{{ item }}</p>
      </template>
    </Timeline>
    <Button size="sm" :disabled="current >= stages.length - 1" @click="current++"> Advance </Button>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Timeline } from 'vael-ui'

const stages = ['Design', 'Build', 'Review', 'Ship']
const current = shallowRef(0)
</script>

<style scoped>
.step-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
