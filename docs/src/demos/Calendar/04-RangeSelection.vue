<template>
  <section class="demo">
    <h3>Range selection</h3>
    <p class="note">
      First click sets the start, a second click completes the range (landing before the start
      restarts it there instead of silently swapping). Hover between picking the two ends to preview
      the range that would commit.
    </p>
    <div class="row">
      <Calendar v-model="rangeValue" selection-mode="range" />
      <output class="panel-text">{{ rangeLabel }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Calendar } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const rangeValue = shallowRef<CalendarRange | null>(null)
const rangeLabel = computed(() => {
  const { start, end } = rangeValue.value ?? {}
  if (!start) return 'No range selected'
  if (!end) return `${start.toDateString()} to … (pick an end date)`
  return `${start.toDateString()} to ${end.toDateString()}`
})
</script>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
