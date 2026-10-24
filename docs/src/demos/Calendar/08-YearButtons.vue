<template>
  <section class="demo">
    <h3>Year buttons</h3>
    <p class="note">
      <code>show-year-buttons</code> adds « and » next to the month arrows to move a whole year, for
      ranges that span years. Without it, click the month name to move by year.
    </p>
    <div class="row">
      <div class="stack">
        <span class="caption">Default</span>
        <Calendar v-model="plain" selection-mode="range" />
      </div>
      <div class="stack">
        <span class="caption">show-year-buttons</span>
        <Calendar v-model="withYears" selection-mode="range" show-year-buttons />
      </div>
    </div>
    <div class="stack">
      <span class="caption">Two months, with a minimum date a year and a half back</span>
      <Calendar
        v-model="twoMonths"
        selection-mode="range"
        :months="2"
        :min-date="minDate"
        show-year-buttons
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Calendar } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const today = new Date()
const minDate = new Date(today.getFullYear() - 1, today.getMonth() - 6, 1)
const plain = shallowRef<CalendarRange | null>(null)
const withYears = shallowRef<CalendarRange | null>(null)
const twoMonths = shallowRef<CalendarRange | null>(null)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-block-end: 1.25rem;
}

.stack {
  display: grid;
  justify-items: start;
  gap: 0.5rem;
}

.caption {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
