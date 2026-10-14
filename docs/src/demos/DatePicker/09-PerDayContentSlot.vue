<template>
  <section class="demo">
    <h3>Per-day content via the #day slot</h3>
    <p class="note">
      The same <code>#day</code> slot as Calendar, passed through to the calendar in the panel. Here
      a dot marks days that are already booked.
    </p>
    <div class="row">
      <DatePicker v-model="value" placeholder="Pick a day" style="max-width: 16rem">
        <template #day="{ date, isCurrentMonth }">
          <span class="cell-inner">
            {{ date.getDate() }}
            <span v-if="isCurrentMonth && isBooked(date)" class="booked-dot" aria-hidden="true" />
          </span>
        </template>
      </DatePicker>
      <output class="panel-text">
        {{ value ? (isBooked(value) ? 'Already booked' : 'Available') : 'Pick a day' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { DatePicker } from 'vael-ui'

const value = shallowRef<Date | null>(null)

// Stand-in bookings: the 5th, 12th and 20th of the current month.
const today = new Date()
const bookedDays = new Set([5, 12, 20])
function isBooked(date: Date): boolean {
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear() &&
    bookedDays.has(date.getDate())
  )
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.panel-text {
  font-size: 0.8125rem;
}

.cell-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.booked-dot {
  inline-size: 4px;
  block-size: 4px;
  border-radius: 999px;
  background: var(--ui-primary);
}
</style>
