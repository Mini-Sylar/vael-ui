<!-- A calendar whose grid slides the way you step months while the month label rolls up or down. -->
<template>
  <section class="demo">
    <h3>Calendar months</h3>
    <Calendar v-model="day" :motion="motion" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Calendar } from 'vael-ui'
import type { CalendarMotion } from 'vael-ui'

const day = shallowRef(new Date())
// Navigation is frequent: a short drift, no bounce.
const motion: CalendarMotion = {
  initial: {
    grid: ({ direction }) => ({ opacity: 0, x: 12 * direction, blur: 2 }),
    label: ({ direction }) => ({ opacity: 0, y: 6 * direction, blur: 2 }),
  },
  exit: {
    grid: ({ direction }) => ({ opacity: 0, x: -12 * direction, blur: 2 }),
    label: ({ direction }) => ({ opacity: 0, y: -6 * direction, blur: 2 }),
  },
  spring: 'snappy',
}
</script>

<style scoped>
.demo {
  display: grid;
  place-items: center;
}
</style>
