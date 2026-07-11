<template>
  <section class="demo">
    <h2>Calendar</h2>
    <p class="note">
      A standalone month-grid — DatePicker's own panel content, usable inline with no popover at
      all. Try it with a keyboard: focus a day, then Left/Right/Up/Down move by day, Home/End jump
      to the week's bounds, PageUp/PageDown move by month, and Shift+PageUp/PageDown by year.
    </p>

    <h3>Basic — <code>v-model</code></h3>
    <div class="row">
      <Calendar v-model="basicValue" />
      <output class="panel-text">
        {{ basicValue ? basicValue.toDateString() : 'Nothing selected yet' }}
      </output>
    </div>

    <h3>Min/max bounds + disabled dates</h3>
    <p class="note">
      Bounded to the current month, with every Sunday disabled via a predicate — both
      minDate/maxDate and disabledDates gray out and block the same day.
    </p>
    <div class="row">
      <Calendar
        v-model="boundedValue"
        :min-date="minDate"
        :max-date="maxDate"
        :disabled-dates="isSunday"
      />
      <output class="panel-text">
        {{ boundedValue ? boundedValue.toDateString() : 'Nothing selected yet' }}
      </output>
    </div>

    <h3>Explicit disabled-dates list</h3>
    <div class="row">
      <Calendar v-model="listValue" :disabled-dates="explicitDisabled" />
      <output class="panel-text">A few specific dates this month are blocked out.</output>
    </div>

    <h3>Range selection — <code>selectionMode="range"</code></h3>
    <p class="note">
      First click sets the start, a second click completes the range (landing before the start
      restarts it there instead of silently swapping). Hover between picking the two ends to preview
      the range that would commit.
    </p>
    <div class="row">
      <Calendar v-model="rangeValue" selection-mode="range" />
      <output class="panel-text">
        {{ rangeValue?.start ? rangeValue.start.toDateString() : 'Nothing' }} –
        {{ rangeValue?.end ? rangeValue.end.toDateString() : '…' }}
      </output>
    </div>

    <h3>Month-only / year-only — <code>view="month"</code> / <code>view="year"</code></h3>
    <p class="note">
      Restricts the whole grid to a coarser granularity — picking a month or a year directly, no day
      grid at all.
    </p>
    <div class="row">
      <Calendar v-model="monthValue" view="month" />
      <Calendar v-model="yearValue" view="year" />
    </div>

    <h3>Header drill-down navigation</h3>
    <p class="note">
      Click the month/year label above a normal (<code>view="date"</code>) calendar to jump into a
      month grid, then a year grid, for fast long-distance navigation — picking a month or year
      there descends back to the day grid instead of committing a value.
    </p>
    <div class="row">
      <Calendar v-model="drillValue" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Calendar } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const basicValue = shallowRef<Date | null>(null)
const boundedValue = shallowRef<Date | null>(null)
const listValue = shallowRef<Date | null>(null)
const rangeValue = shallowRef<CalendarRange | null>(null)
const monthValue = shallowRef<Date | null>(null)
const yearValue = shallowRef<Date | null>(null)
const drillValue = shallowRef<Date | null>(null)

const today = new Date()
const minDate = new Date(today.getFullYear(), today.getMonth(), 1)
const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

const explicitDisabled = [
  new Date(today.getFullYear(), today.getMonth(), 3),
  new Date(today.getFullYear(), today.getMonth(), 4),
  new Date(today.getFullYear(), today.getMonth(), 17),
]
</script>
