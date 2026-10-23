<template>
  <section class="demo">
    <h3>Min and max dates, and disabled dates</h3>
    <p class="note">
      <code>min-date</code> and <code>max-date</code> limit the calendar to this month, and a
      <code>disabled-dates</code> function disables every Sunday. Both gray out the day and block
      it.
    </p>
    <div class="row">
      <Calendar
        v-model="boundedValue"
        :locale="currentLocale"
        :min-date="minDate"
        :max-date="maxDate"
        :disabled-dates="isSunday"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Calendar } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const boundedValue = shallowRef<Date | null>(null)

const today = new Date()
const minDate = new Date(today.getFullYear(), today.getMonth(), 1)
const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
function isSunday(date: Date): boolean {
  return date.getDay() === 0
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
}
</style>
