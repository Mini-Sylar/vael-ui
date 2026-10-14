<template>
  <section class="demo">
    <h3>Two months side by side</h3>
    <p class="note">
      <code>:months="2"</code> shows two months next to each other, so a range that crosses into the
      next month stays in view. Hovering in either month previews the range across both.
    </p>
    <div class="stack">
      <Calendar v-model="rangeValue" selection-mode="range" :months="2" />
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
.stack {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
