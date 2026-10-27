<template>
  <section class="demo">
    <h3>Extreme: an elastic orb</h3>
    <p class="note">
      The <code>#indicator</code> slot receives the pull's <code>state</code> and
      <code>progress</code>. While you pull, a ring fills with your finger. Each part holds a
      <code>v-animate</code> look per state and moves to the next one from wherever it is: past the
      threshold the orb blips and the arrow flips on a spring that rings past it, refreshing shrinks
      the arrow away and spins the orb, and finishing draws a check with a pulse.
    </p>
    <PullToRefresh class="ptr-box" :on-refresh="refresh">
      <template #indicator="{ state, progress }">
        <div v-animate="blip[state]" class="orb">
          <svg
            v-animate="{ animate: state === 'loading' ? SPIN : STILL }"
            class="orb-svg"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <circle class="orb-track" cx="24" cy="24" r="20" />
            <circle
              v-animate="ring[state]"
              class="orb-ring"
              cx="24"
              cy="24"
              r="20"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="CIRCUMFERENCE * (1 - progress)"
              transform="rotate(-90 24 24)"
            />
            <g v-animate="arrow[state]" class="orb-arrow">
              <path d="M24 15v16M17 25l7 7 7-7" />
            </g>
            <path
              v-if="state === 'done'"
              v-animate="DRAW"
              class="orb-check"
              d="M15.5 25.5l6 6 11-13"
              pathLength="1"
              stroke-dasharray="1"
            />
          </svg>
        </div>
      </template>
      <ul class="ptr-list">
        <li v-for="row in rows" :key="row" class="ptr-row">{{ row }}</li>
      </ul>
    </PullToRefresh>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PullToRefresh } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import type { PullToRefreshState } from 'vael-ui'
import type { AnimateDirectiveValue, MotionValues } from 'vael-ui/motion'

const CIRCUMFERENCE = 2 * Math.PI * 20

const rows = shallowRef([
  'Design review',
  'Standup notes',
  'Release checklist',
  'Invoices',
  'Travel',
  'Reading list',
])

async function refresh() {
  await new Promise((resolve) => setTimeout(resolve, 1400))
  rows.value = [`New: ${new Date().toLocaleTimeString()}`, ...rows.value]
}

// GSAP's power2 curves, and its elastic.out as a spring that rings past.
const OUT = 'cubic-bezier(0.33, 1, 0.68, 1)'
const IN = 'cubic-bezier(0.32, 0, 0.67, 0)'
const ELASTIC = { damping: 0.4, response: 0.3 }

// Each part holds a look per state and moves to the next from wherever it is on screen; a state
// with no look snaps back to the part's own, as clearProps does.
type Looks = Partial<Record<PullToRefreshState, AnimateDirectiveValue>>

// Flipped past the threshold, shrunk away while refreshing and done, home again after.
const home = { animate: { rotate: 0 }, duration: 300, easing: 'out' }
const hidden = { animate: { rotate: 180, opacity: 0, scale: 0.4 }, duration: 200, easing: IN }
const arrow: Record<PullToRefreshState, AnimateDirectiveValue> = {
  idle: home,
  pulling: home,
  ready: { animate: { rotate: 180 }, spring: ELASTIC },
  loading: hidden,
  done: hidden,
}
// The ring follows your finger; refreshing shrinks it to an arc, finishing closes it.
const ring: Looks = {
  loading: { animate: { strokeDashoffset: CIRCUMFERENCE * 0.72 }, duration: 300, easing: OUT },
  done: { animate: { strokeDashoffset: 0 }, duration: 250, easing: OUT },
}
// A blip as the threshold is crossed, and another as it finishes.
const blip: Looks = {
  ready: { animate: { scale: [1.28, 1] }, duration: 40, easing: OUT },
  done: { animate: { scale: { value: [1, 1.2, 1], duration: 60, delay: 0.2 } } },
}
// Refreshing, the orb turns every 850ms; otherwise it stands straight at once.
const SPIN: MotionValues = {
  rotate: { value: [0, 360], duration: 850, easing: 'linear', repeat: Infinity },
}
const STILL: MotionValues = { rotate: { value: 0, duration: 0 } }
// The check draws itself in as it appears, and goes at once.
const DRAW: AnimateDirectiveValue = {
  initial: { strokeDashoffset: { value: 1, duration: 350, easing: OUT, delay: 0.1 } },
  exit: false,
}
</script>

<style scoped>
.ptr-box {
  block-size: 320px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  margin-block-end: 1.5rem;
}
.ptr-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ptr-row {
  padding: 0.75rem 1rem;
  border-block-end: 1px solid var(--ui-border);
  font-size: 0.875rem;
}

.orb {
  display: grid;
  place-items: center;
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: 50%;
  background: var(--ui-surface);
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.12);
}
.orb-svg {
  inline-size: 2.5rem;
  block-size: 2.5rem;
  overflow: visible;
}
.orb-track {
  fill: none;
  stroke: var(--ui-muted);
  stroke-width: 3;
}
.orb-ring {
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 3;
  stroke-linecap: round;
}
.orb-arrow,
.orb-svg {
  transform-origin: 50% 50%;
}
.orb-arrow path,
.orb-check {
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
