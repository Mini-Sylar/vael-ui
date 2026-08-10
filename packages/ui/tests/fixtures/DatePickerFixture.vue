<template>
  <output data-testid="model">{{ modelText }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <DatePicker
    v-model="model"
    v-model:open="open"
    :selection-mode="selectionMode"
    :view="view"
    :min-date="minDate"
    :max-date="maxDate"
    :disabled-dates="disabledDates"
    :disabled="disabled"
    placeholder="Pick a date"
  />
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import DatePicker from '../../src/components/DatePicker/DatePicker.vue'
import type {
  CalendarDisabledDates,
  CalendarRange,
  CalendarSelectionMode,
  CalendarView,
} from '../../src/components/Calendar/Calendar.vue'

const props = withDefaults(
  defineProps<{
    selectionMode?: CalendarSelectionMode
    view?: CalendarView
    minDate?: Date
    maxDate?: Date
    disabledDates?: CalendarDisabledDates
    disabled?: boolean
    initialValue?: Date
  }>(),
  {
    selectionMode: 'single',
    view: 'date',
    minDate: undefined,
    maxDate: undefined,
    disabledDates: undefined,
    disabled: false,
    initialValue: undefined,
  },
)

const model = shallowRef<Date | CalendarRange | null>(props.initialValue ?? null)
const open = shallowRef(false)

function isRange(value: Date | CalendarRange | null): value is CalendarRange {
  return value != null && typeof value === 'object' && 'start' in value
}
const modelText = computed(() => {
  const value = model.value
  if (!value) return 'null'
  if (isRange(value)) {
    return `${value.start ? value.start.toDateString() : 'null'} / ${value.end ? value.end.toDateString() : 'null'}`
  }
  return value.toDateString()
})
</script>
