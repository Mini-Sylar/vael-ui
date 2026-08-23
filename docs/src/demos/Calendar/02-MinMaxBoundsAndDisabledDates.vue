<template>
  <section class="demo">
    <h3>Min/max bounds and disabled dates</h3>
    <p class="note">
      Bounded to the current month, with every Sunday disabled via a predicate, both min/maxDate and
      disabledDates gray out and block the same day.
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
