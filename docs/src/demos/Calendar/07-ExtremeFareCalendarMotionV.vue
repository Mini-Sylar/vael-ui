<template>
  <section class="demo">
    <h3>Extreme: a fare calendar (motion-v)</h3>
    <p class="note">
      The <code>#day</code> slot shows each day's fare, coloured from cheap to pricey, with a dot on
      the best deals. Every day is motion-v markup inside the slot, so it animates without any DOM
      querying: a new month falls in on a diagonal wave, departure and return pop when picked, and a
      finished trip ripples its fares from one end to the other. <code>:motion="false"</code>
      turns off the built-in slide so the two don't fight.
    </p>
    <div class="fare">
      <Calendar
        v-model="trip"
        selection-mode="range"
        :months="2"
        :min-date="today"
        :motion="false"
        locale="en-US"
      >
        <template #day="{ date, isCurrentMonth, isDisabled, isSelected, isToday }">
          <!-- New month: days fall in from a blur on a diagonal wave. -->
          <motion.span
            class="fare-day"
            :initial="reduce ? false : { opacity: 0, y: -14, scale: 0.6, filter: 'blur(6px)' }"
            :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
            :transition="{ type: 'spring', visualDuration: 0.45, bounce: 0.35, delay: wave(date) }"
          >
            <!-- Departure and return pop when picked. -->
            <motion.span
              class="fare-stack"
              :animate="{ scale: isSelected && !reduce ? 1.14 : 1 }"
              :transition="{ type: 'spring', visualDuration: 0.3, bounce: 0.55 }"
            >
              <span class="fare-date" :class="{ 'fare-today': isToday }">{{ date.getDate() }}</span>
              <!-- A finished trip ripples its fares from departure to return. -->
              <motion.span
                v-if="isCurrentMonth && !isDisabled"
                :key="inTrip(date) ? `trip-${tripId}` : 'idle'"
                class="fare-price"
                :data-tier="tier(fare(date))"
                :initial="inTrip(date) && !reduce ? { opacity: 0, y: 5, scale: 0.4 } : false"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :transition="{
                  type: 'spring',
                  visualDuration: 0.4,
                  bounce: 0.5,
                  delay: ripple(date),
                }"
              >
                ${{ fare(date) }}
              </motion.span>
            </motion.span>
            <span
              v-if="isCurrentMonth && !isDisabled && tier(fare(date)) === 'deal'"
              class="fare-deal"
              aria-hidden="true"
            />
          </motion.span>
        </template>
      </Calendar>
      <output class="fare-summary">{{ summary }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { Calendar } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const reduce = useReducedMotion()
const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const trip = shallowRef<CalendarRange | null>(null)
const DAY = 86_400_000

// A stand-in fare per day: steady for a given date, pricier at weekends.
function fare(date: Date): number {
  const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate()
  const noise = ((seed * 9301 + 49297) % 233280) / 233280
  const weekend = date.getDay() === 5 || date.getDay() === 6 ? 70 : 0
  return Math.round(89 + noise * 240 + weekend)
}
function tier(price: number): 'deal' | 'low' | 'high' | 'mid' {
  if (price < 110) return 'deal'
  if (price < 170) return 'low'
  if (price > 280) return 'high'
  return 'mid'
}

// Row plus column, so days fall in from the top-left corner.
function wave(date: Date): number {
  const firstColumn = (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7
  const column = (date.getDay() + 6) % 7
  const row = Math.floor((date.getDate() - 1 + firstColumn) / 7)
  return reduce.value ? 0 : (row + column) * 0.028
}

// Each finished trip gets a new id, which remounts its fares so they ripple again.
const tripId = shallowRef(0)
watch(
  () => trip.value?.end,
  (end) => end && tripId.value++,
)
function inTrip(date: Date): boolean {
  const { start, end } = trip.value ?? {}
  return !!start && !!end && date >= start && date <= end
}
function ripple(date: Date): number {
  const start = trip.value?.start
  if (!start || reduce.value) return 0
  return Math.min((date.getTime() - start.getTime()) / DAY, 20) * 0.03
}

const summary = computed(() => {
  const { start, end } = trip.value ?? {}
  if (!start) return 'Pick your departure'
  if (!end) return 'Now pick your return'
  const nights: Date[] = []
  for (let d = start.getTime(); d < end.getTime(); d += DAY) nights.push(new Date(d))
  if (!nights.length) return 'Pick a later return'
  const total = nights.reduce((sum, night) => sum + fare(night), 0)
  const cheapest = nights.reduce((best, night) => (fare(night) < fare(best) ? night : best))
  const format = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${nights.length} ${nights.length === 1 ? 'night' : 'nights'} · $${total.toLocaleString('en-US')} · cheapest ${format(cheapest)} ($${fare(cheapest)})`
})
</script>

<style scoped>
.fare {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
}

/* Room for a fare under each date. */
.fare :deep(.ui-calendar-weekdays),
.fare :deep(.ui-calendar-week) {
  grid-template-columns: repeat(7, 2.75rem);
}
.fare :deep(.ui-calendar-cell) {
  aspect-ratio: auto;
  block-size: 3rem;
}
/* Today is marked inside the day, so it arrives with it instead of waiting there empty. */
.fare :deep(.ui-calendar-cell--today) {
  box-shadow: none;
}
.fare-today {
  text-decoration: underline 2px var(--ui-primary);
  text-underline-offset: 3px;
}

.fare-day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  line-height: 1;
}

.fare-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.fare-date {
  font-size: 0.8125rem;
}

.fare-price {
  font-size: 0.625rem;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}
.fare-price[data-tier='deal'],
.fare-price[data-tier='low'] {
  color: oklch(0.58 0.14 150);
  font-weight: 600;
}
.fare-price[data-tier='high'] {
  opacity: 0.6;
}
/* On a selected day the fare takes the selection's text colour. */
.fare :deep(.ui-calendar-cell--selected .fare-price) {
  color: inherit;
  opacity: 0.85;
}

.fare-deal {
  position: absolute;
  inset-block-start: -0.25rem;
  inset-inline-end: -0.375rem;
  inline-size: 0.3125rem;
  block-size: 0.3125rem;
  border-radius: 999px;
  background: oklch(0.65 0.16 150);
}

.fare-summary {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
</style>
