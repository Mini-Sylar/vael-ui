<template>
  <section class="demo">
    <h3>Range presets</h3>
    <p class="note">
      Put buttons for common ranges next to a range picker. Each button builds a range with
      <code>start</code> and <code>end</code> and sets it as the <code>v-model</code> value. You can
      still pick dates by hand.
    </p>
    <div class="presets">
      <DatePicker
        v-model="range"
        :locale="currentLocale"
        selection-mode="range"
        placeholder="Pick a date range"
      />
      <div class="preset-buttons" role="group" aria-label="Presets">
        <Button
          v-for="preset in presets"
          :key="preset.label"
          size="sm"
          variant="ghost"
          :aria-pressed="isActive(preset.range())"
          @click="range = preset.range()"
        >
          {{ preset.label }}
        </Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button, DatePicker } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

// Midnight today, so a preset matches the days the calendar picks.
function today() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

const presets: { label: string; range: () => CalendarRange }[] = [
  { label: 'Today', range: () => ({ start: today(), end: today() }) },
  { label: 'Last 7 days', range: () => ({ start: addDays(today(), -6), end: today() }) },
  {
    label: 'This month',
    range: () => {
      const start = today()
      start.setDate(1)
      return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 0) }
    },
  },
]

const range = shallowRef<CalendarRange | null>(presets[1]!.range())

const sameDay = (a: Date | null, b: Date | null) => a?.getTime() === b?.getTime()
function isActive(preset: CalendarRange) {
  return (
    !!range.value &&
    sameDay(range.value.start, preset.start) &&
    sameDay(range.value.end, preset.end)
  )
}
</script>

<style scoped>
.presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.preset-buttons [aria-pressed='true'] {
  background: var(--ui-muted);
}
</style>
