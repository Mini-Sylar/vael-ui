<template>
  <section class="demo">
    <h3>Extreme: a fare calendar</h3>
    <p class="note">
      The <code>#day</code> slot shows each day's fare, colored from cheap to pricey, with a dot on
      the best deals. Every day is <code>v-animate</code> markup: a new month falls in on a diagonal
      wave (<code>delay</code> from the cell's place), departure and return spring up through
      <code>animate</code>, and a finished trip ripples its fares from one end to the other with
      <code>replay</code>. <code>:motion="false"</code> turns off the built-in slide so the two
      don't fight.
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
          <span v-animate="fall(date)" class="fare-day">
            <!-- Departure and return pop when picked. -->
            <span
              v-animate="{ animate: { scale: isSelected ? 1.14 : 1 }, spring: pop }"
              class="fare-stack"
            >
              <span class="fare-date" :class="{ 'fare-today': isToday }">{{ date.getDate() }}</span>
              <!-- A finished trip ripples its fares from departure to return. -->
              <span
                v-if="isCurrentMonth && !isDisabled"
                v-animate="ripple(date)"
                class="fare-price"
                :data-tier="tier(fare(date))"
              >
                ${{ fare(date) }}
              </span>
            </span>
            <span
              v-if="isCurrentMonth && !isDisabled && tier(fare(date)) === 'deal'"
              class="fare-deal"
              aria-hidden="true"
            />
          </span>
        </template>
      </Calendar>
      <output class="fare-summary">{{ summary }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Calendar, vAnimate } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

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
  return (row + column) * 0.028
}
// motion-v's springs in vael-ui's terms: damping is 1 − bounce, response is 1.2 × visualDuration.
// `when: 'visible'`: mounted mid-scroll, where on-mount appearances are skipped, it waits to be seen.
const fall = (date: Date) => ({
  initial: { opacity: 0, y: -14, scale: 0.6, blur: 6 },
  spring: { damping: 0.65, response: 0.54 },
  delay: wave(date),
  when: 'visible' as const,
})
const pop = { damping: 0.45, response: 0.36 }
// Fares inside a finished trip ripple from departure to return, again for each new return.
function ripple(date: Date) {
  const { start, end } = trip.value ?? {}
  if (!start || !end || date < start || date > end) return undefined
  return {
    initial: { opacity: 0, y: 5, scale: 0.4 },
    spring: { damping: 0.5, response: 0.48 },
    delay: Math.min((date.getTime() - start.getTime()) / DAY, 20) * 0.03,
    replay: end,
  }
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
