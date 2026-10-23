<template>
  <section class="demo">
    <h3>Per-day content with the <code>#day</code> slot</h3>
    <p class="note">
      A dot marks days with scheduled items, while Calendar keeps its grid, keyboard navigation and
      month transition. The slot receives
      <code>{ date, isCurrentMonth, isToday, isSelected, isDisabled }</code> and replaces only the
      cell’s content. Click, hover, focus and ARIA attributes stay with Calendar.
    </p>
    <div class="row">
      <Calendar v-model="value" :locale="currentLocale">
        <template #day="{ date, isCurrentMonth }">
          <span class="cell-inner">
            {{ date.getDate() }}
            <span v-if="isCurrentMonth && eventCount(date)" class="event-dot" aria-hidden="true" />
          </span>
        </template>
      </Calendar>
      <output class="panel-text">
        {{ value ? `${value.toDateString()} - ${eventCount(value)} item(s)` : 'Pick a day' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Calendar } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const value = shallowRef<Date | null>(null)

// Stand-in "has items scheduled" data - the 5th, 12th, and 20th of the current month.
const today = new Date()
const eventDays = new Set([5, 12, 20])
function eventCount(date: Date): number {
  if (date.getMonth() !== today.getMonth() || date.getFullYear() !== today.getFullYear()) return 0
  return eventDays.has(date.getDate()) ? 1 : 0
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: flex-start;
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

.event-dot {
  inline-size: 4px;
  block-size: 4px;
  border-radius: 999px;
  background: var(--ui-primary);
}
</style>
