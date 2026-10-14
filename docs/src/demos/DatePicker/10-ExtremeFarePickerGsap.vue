<template>
  <section class="demo">
    <h3>Extreme: a fare picker (GSAP + motion-v)</h3>
    <p class="note">
      <code>force-mount</code> hands the panel to you: GSAP unrolls the exposed
      <code>panelEl</code> from the field when it opens, and <code>beforeClose(done)</code> rolls it
      back up. Each opening replays the days rippling in through the <code>#day</code> slot, and the
      <code>#label</code> slot puts each month's cheapest fare next to its name.
      <code>:close-on-select="false"</code> keeps it open while you try a few returns.
    </p>
    <div class="fare">
      <DatePicker
        ref="picker"
        v-model="trip"
        v-model:open="open"
        selection-mode="range"
        :months="2"
        :min-date="today"
        force-mount
        :close-on-select="false"
        :before-close="rollUp"
        locale="en-US"
        placeholder="Departure – return"
      >
        <template #label="{ label, date, level }">
          <span class="fare-label">
            {{ label }}
            <span v-if="level === 'date'" class="fare-from">from ${{ cheapestIn(date) }}</span>
          </span>
        </template>
        <template #day="{ date, isCurrentMonth, isDisabled, isToday }">
          <motion.span
            :key="openCount"
            class="fare-day"
            :initial="reduce ? false : { opacity: 0, y: -8, scale: 0.8, filter: 'blur(4px)' }"
            :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
            :transition="{ type: 'spring', visualDuration: 0.3, bounce: 0.3, delay: wave(date) }"
          >
            <span :class="{ 'fare-today': isToday }">{{ date.getDate() }}</span>
            <span v-if="isCurrentMonth && !isDisabled" class="fare-price" :data-deal="isDeal(date)">
              ${{ fare(date) }}
            </span>
          </motion.span>
        </template>
      </DatePicker>
      <output class="fare-summary">{{ summary }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { motion, useReducedMotion } from 'motion-v'
import { DatePicker } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const picker = useTemplateRef('picker')
const reduce = useReducedMotion()
const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const trip = shallowRef<CalendarRange | null>(null)
const open = shallowRef(false)
const DAY = 86_400_000

// A stand-in fare per day: steady for a given date, pricier at weekends.
function fare(date: Date): number {
  const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate()
  const noise = ((seed * 9301 + 49297) % 233280) / 233280
  const weekend = date.getDay() === 5 || date.getDay() === 6 ? 70 : 0
  return Math.round(89 + noise * 240 + weekend)
}
const isDeal = (date: Date) => fare(date) < 120
function cheapestIn(month: Date): number {
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  let best = Infinity
  for (let day = 1; day <= last; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    if (date >= today) best = Math.min(best, fare(date))
  }
  return best
}

// Row plus column, so days ripple in from the top-left corner.
function wave(date: Date): number {
  const firstColumn = (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7
  const column = (date.getDay() + 6) % 7
  const row = Math.floor((date.getDate() - 1 + firstColumn) / 7)
  return reduce.value ? 0 : (row + column) * 0.016
}

// The panel unrolls from the field it hangs off, and rolls back up into it.
const closed = (side: string) => (side === 'top' ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)')
function sideOf(panel: HTMLElement) {
  return panel.parentElement?.dataset.side ?? 'bottom'
}

// Bumped on every open, so the days remount and ripple in again.
const openCount = shallowRef(0)
watch(open, async (isOpen) => {
  if (!isOpen) return
  openCount.value++
  await nextTick()
  const panel = picker.value?.panelEl
  if (!panel || reduce.value) return
  gsap.fromTo(
    panel,
    { clipPath: closed(sideOf(panel)) },
    { clipPath: 'inset(0 0 0% 0)', duration: 0.32, ease: 'power3.out' },
  )
})

function rollUp(done: () => void) {
  const panel = picker.value?.panelEl
  if (!panel || reduce.value) return done()
  gsap.to(panel, {
    clipPath: closed(sideOf(panel)),
    duration: 0.18,
    ease: 'power2.in',
    onComplete: done,
  })
}

const summary = computed(() => {
  const { start, end } = trip.value ?? {}
  if (!start || !end) return 'Pick a departure and a return'
  let total = 0
  let nights = 0
  for (let d = start.getTime(); d < end.getTime(); d += DAY) {
    total += fare(new Date(d))
    nights++
  }
  return `${nights} ${nights === 1 ? 'night' : 'nights'} · $${total.toLocaleString('en-US')}`
})
</script>

<style scoped>
.fare {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
}

.fare-label {
  display: inline-flex;
  align-items: baseline;
  gap: 0.375rem;
}

.fare-from {
  font-size: 0.6875rem;
  font-weight: 500;
  color: oklch(0.58 0.14 150);
}

.fare-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  line-height: 1;
}

.fare-price {
  font-size: 0.5625rem;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}
.fare-price[data-deal='true'] {
  color: oklch(0.58 0.14 150);
  font-weight: 600;
}

.fare-today {
  text-decoration: underline 2px var(--ui-primary);
  text-underline-offset: 3px;
}

.fare-summary {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
</style>

<!-- The panel is teleported, so its cells are sized from here, outside the scoped styles. -->
<style>
.ui-date-picker-panel:has(.fare-day) .ui-calendar-weekdays,
.ui-date-picker-panel:has(.fare-day) .ui-calendar-week {
  grid-template-columns: repeat(7, 2.5rem);
}
.ui-date-picker-panel:has(.fare-day) .ui-calendar-cell {
  aspect-ratio: auto;
  block-size: 2.75rem;
}
/* Today is marked inside the day, so it arrives with it instead of waiting there empty. */
.ui-date-picker-panel:has(.fare-day) .ui-calendar-cell--today {
  box-shadow: none;
}
</style>
