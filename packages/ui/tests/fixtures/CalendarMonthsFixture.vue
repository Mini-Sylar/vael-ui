<template>
  <output data-testid="model">{{ label }}</output>
  <Calendar
    v-model="model"
    selection-mode="range"
    :months="months"
    :max-date="maxDate"
    :first-day-of-week="1"
    locale="en-US"
  />
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import Calendar from '../../src/components/Calendar/Calendar.vue'
import type { CalendarRange } from '../../src/components/Calendar/Calendar.vue'

const props = withDefaults(defineProps<{ months?: number; maxDate?: Date; start?: Date }>(), {
  months: 2,
  maxDate: undefined,
  start: undefined,
})

const model = shallowRef<CalendarRange | null>(
  props.start ? { start: props.start, end: null } : null,
)
const label = computed(() =>
  model.value
    ? `${model.value.start?.toDateString() ?? 'null'} - ${model.value.end?.toDateString() ?? 'null'}`
    : 'null',
)
</script>
