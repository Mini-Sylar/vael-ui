<template>
  <section class="demo">
    <h2>Calendar</h2>
    <p class="note">
      A standalone month-grid: DatePicker's own panel content, usable inline with no popover at all.
      Try it with a keyboard: focus a day, then Left/Right/Up/Down move by day, Home/End jump to the
      week's bounds, PageUp/PageDown move by month, and Shift+PageUp/PageDown by year.
    </p>

    <h3>Basic, with the selected date shown</h3>
    <div class="row">
      <Calendar v-model="basicValue" />
      <output class="panel-text">
        {{ basicValue ? basicValue.toDateString() : 'Nothing selected yet' }}
      </output>
    </div>

    <h3>Min/max bounds and disabled dates</h3>
    <p class="note">
      Bounded to the current month, with every Sunday disabled via a predicate, both min/maxDate and
      disabledDates gray out and block the same day.
    </p>
    <div class="row">
      <Calendar
        v-model="boundedValue"
        :min-date="minDate"
        :max-date="maxDate"
        :disabled-dates="isSunday"
      />
    </div>

    <h3>Locale formatting</h3>
    <p class="note">
      <code>locale</code> drives month/weekday names and the week's start day via
      <code>Intl.DateTimeFormat</code>, no separate i18n data files to ship. <code>fr-FR</code>
      below starts the week on Monday; compare it to the plain calendars above, which default to the
      runtime's own locale.
    </p>
    <div class="row">
      <Calendar v-model="localeValue" locale="fr-FR" />
      <output class="panel-text">
        {{ localeValue ? frFormatter.format(localeValue) : 'Aucune date choisie' }}
      </output>
    </div>

    <h3>Range selection</h3>
    <p class="note">
      First click sets the start, a second click completes the range (landing before the start
      restarts it there instead of silently swapping). Hover between picking the two ends to preview
      the range that would commit.
    </p>
    <div class="row">
      <Calendar v-model="rangeValue" selection-mode="range" />
      <output class="panel-text"> {{ rangeStartLabel }} to {{ rangeEndLabel }} </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Calendar } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const basicValue = shallowRef<Date | null>(null)
const boundedValue = shallowRef<Date | null>(null)
const localeValue = shallowRef<Date | null>(null)
const rangeValue = shallowRef<CalendarRange | null>(null)
const rangeStartLabel = computed(() =>
  rangeValue.value?.start ? rangeValue.value.start.toDateString() : 'Nothing',
)
const rangeEndLabel = computed(() =>
  rangeValue.value?.end ? rangeValue.value.end.toDateString() : '...',
)

const today = new Date()
const minDate = new Date(today.getFullYear(), today.getMonth(), 1)
const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

const frFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' })
</script>
