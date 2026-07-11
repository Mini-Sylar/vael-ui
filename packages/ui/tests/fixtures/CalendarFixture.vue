<template>
  <output data-testid="model">{{ model ? model.toDateString() : 'null' }}</output>
  <Calendar
    v-model="model"
    :min-date="minDate"
    :max-date="maxDate"
    :disabled-dates="disabledDates"
    @month-change="onMonthChange"
  />
  <output data-testid="month-change-count">{{ monthChangeCount }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Calendar from '../../src/components/Calendar.vue'
import type { CalendarDisabledDates } from '../../src/components/Calendar.vue'

const props = withDefaults(
  defineProps<{
    minDate?: Date
    maxDate?: Date
    disabledDates?: CalendarDisabledDates
    /** Seeds the model so the grid opens on a KNOWN month, instead of
     * whatever "today" happens to be when the test runs. */
    initialValue?: Date
  }>(),
  { minDate: undefined, maxDate: undefined, disabledDates: undefined, initialValue: undefined },
)

const model = shallowRef<Date | null>(props.initialValue ?? null)
const monthChangeCount = shallowRef(0)
function onMonthChange() {
  monthChangeCount.value++
}
</script>
