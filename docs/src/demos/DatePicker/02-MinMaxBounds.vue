<template>
  <section class="demo">
    <h3>Min and max dates, and disabled dates</h3>
    <p class="note">
      <code>min-date</code> and <code>max-date</code> limit it to this month, and a
      <code>disabled-dates</code> function disables weekends.
    </p>
    <DatePicker
      style="max-inline-size: 16rem"
      v-model="boundedValue"
      :locale="currentLocale"
      :min-date="minDate"
      :max-date="maxDate"
      :disabled-dates="isWeekend"
      placeholder="Weekdays this month only"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatePicker } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const boundedValue = shallowRef<Date | null>(null)

const today = new Date()
const minDate = new Date(today.getFullYear(), today.getMonth(), 1)
const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}
</script>
