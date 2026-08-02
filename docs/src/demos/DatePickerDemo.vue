<template>
  <section class="demo">
    <h2>DatePicker</h2>
    <p class="note">
      Select's own trigger/positioner/panel chrome wrapping a real <code>Calendar</code> instead of
      a listbox. Opens on click/focus, closes and shows the formatted date the moment a day is
      picked. Try it with a keyboard: Tab to the field, then ArrowDown/Enter to open, focus lands
      right on the grid, ready for the same arrow-key navigation as the standalone Calendar.
    </p>

    <h3>Basic, with a placeholder</h3>
    <div class="row">
      <DatePicker v-model="basicValue" :locale="currentLocale" placeholder="Pick a date" />
      <output class="panel-text">
        {{ basicValue ? basicValue.toDateString() : 'Nothing selected yet' }}
      </output>
    </div>

    <h3>Min/max bounds and disabled dates</h3>
    <p class="note">Bounded to this month, with every weekend disabled via a predicate.</p>
    <DatePicker
      v-model="boundedValue"
      :locale="currentLocale"
      :min-date="minDate"
      :max-date="maxDate"
      :disabled-dates="isWeekend"
      placeholder="Weekdays this month only"
    />

    <h3>Field-wrapped, required with validation</h3>
    <p class="note">Same "standalone-or-Field" contract as every other control here.</p>
    <Field
      label="Departure date"
      description="Required for one-way bookings"
      :required="true"
      :error="fieldError"
    >
      <DatePicker
        v-model="fieldValue"
        :locale="currentLocale"
        placeholder="Choose a departure date"
      />
    </Field>

    <h3>Range selection</h3>
    <p class="note">
      The trigger shows both ends once committed; the panel stays open after the first click since
      there's a second date still to pick.
    </p>
    <DatePicker
      v-model="rangeValue"
      :locale="currentLocale"
      selection-mode="range"
      placeholder="Pick a date range"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatePicker, Field } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const basicValue = shallowRef<Date | null>(null)
const boundedValue = shallowRef<Date | null>(null)
const fieldValue = shallowRef<Date | null>(null)
const rangeValue = shallowRef<CalendarRange | null>(null)

const today = new Date()
const minDate = new Date(today.getFullYear(), today.getMonth(), 1)
const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

const fieldError = computed(() => (fieldValue.value ? '' : 'Pick a departure date to continue'))
</script>
