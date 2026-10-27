<template>
  <section class="demo">
    <h3>Horizontal, advancing with <code>current</code></h3>
    <p class="note">
      <code>current</code> is a plain number, not a <code>v-model</code>: Timeline never changes it.
      Bind your own ref and step it as your UI needs. On a straight line like this one,
      <code>completed</code> and <code>active</code> follow from <code>current</code>, so you don't
      write those functions.
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
