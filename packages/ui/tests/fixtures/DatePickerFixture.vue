<template>
  <output data-testid="model">{{ modelText }}</output>
  <output data-testid="model-time">{{ modelTimeText }}</output>
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
    :show-button-bar="showButtonBar"
    :show-time="showTime"
    :time-only="timeOnly"
    :hour-format="hourFormat"
    :minute-step="minuteStep"
    locale="en-US"
    placeholder="Pick a date"
  >
    <template v-if="customFooter" #footer>
      <span data-testid="custom-footer">custom footer</span>
    </template>
  </DatePicker>
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
    showButtonBar?: boolean
    customFooter?: boolean
    showTime?: boolean
    timeOnly?: boolean
    hourFormat?: '12' | '24'
    minuteStep?: number
  }>(),
  {
    selectionMode: 'single',
    view: 'date',
    minDate: undefined,
    maxDate: undefined,
    disabledDates: undefined,
    disabled: false,
    initialValue: undefined,
    showButtonBar: false,
    customFooter: false,
    showTime: false,
    timeOnly: false,
    hourFormat: undefined,
    minuteStep: 1,
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
const modelTimeText = computed(() => {
  const value = model.value
  if (!value || isRange(value)) return ''
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
})
</script>
