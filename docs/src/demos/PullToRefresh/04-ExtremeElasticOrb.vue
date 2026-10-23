<template>
  <section class="demo">
    <h3>Extreme: an elastic orb</h3>
    <p class="note">
      The <code>#indicator</code> slot hands you the pull's <code>state</code> and
      <code>progress</code>. While you pull, a ring fills with your finger. Crossing the threshold
      snaps the orb and flips the arrow on <code>useSpringValue</code> springs, refreshing spins it,
      and finishing draws a check with <code>v-animate</code> and pops the orb.
    </p>
    <PullToRefresh ref="ptr" class="ptr-box" :on-refresh="refresh">
      <template #indicator="{ state, progress }">
        <div class="orb" :style="{ scale: pop.value.value }">
          <svg
            class="orb-svg"
            :class="{ 'orb-spin': state === 'loading' }"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <circle class="orb-track" cx="24" cy="24" r="20" />
            <circle
              class="orb-ring"
              :class="{ 'orb-ring--settle': state !== 'pulling' && state !== 'ready' }"
              cx="24"
              cy="24"
              r="20"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="CIRCUMFERENCE * (1 - ringFill(state, progress))"
              transform="rotate(-90 24 24)"
            />
            <g
              v-if="state !== 'loading' && state !== 'done'"
              class="orb-arrow"
              :style="{ rotate: `${flip.value.value}deg` }"
            >
              <path d="M24 15v16M17 25l7 7 7-7" />
            </g>
            <path
              v-if="state === 'done'"
              v-animate="draw"
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
import { shallowRef, useTemplateRef, watch } from 'vue'
import { PullToRefresh, useSpringValue, vAnimate } from 'vael-ui'

const CIRCUMFERENCE = 2 * Math.PI * 20
const ptr = useTemplateRef('ptr')

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

// Springs: the orb's size, and the arrow's turn. Both settle with a bounce.
const pop = useSpringValue(1, { damping: 0.4, response: 0.45 })
const flip = useSpringValue(0, { damping: 0.45, response: 0.5 })

// The ring follows your finger while pulling; refreshing it is a short arc, done it is whole.
function ringFill(state: string, progress: number) {
  if (state === 'loading') return 0.28
  if (state === 'done') return 1
  return progress
}

// Crossing the threshold snaps the orb out and flips the arrow; finishing pops it again.
watch(
  () => ptr.value?.state,
  (state) => {
    flip.set(state === 'ready' ? 180 : 0)
    if (state === 'ready' || state === 'done') {
      pop.jump(state === 'ready' ? 1.28 : 1.2)
      pop.set(1)
    }
  },
)

// The check draws itself in the moment it appears.
const draw = {
  initial: { strokeDashoffset: 1 },
  duration: 350,
  easing: 'var(--ui-ease-out)',
  delay: 0.1,
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
.orb-ring--settle {
  transition: stroke-dashoffset 0.3s var(--ui-ease-out);
}
.orb-ring {
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 3;
  stroke-linecap: round;
}
.orb-arrow {
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
.orb-spin {
  transform-origin: 50% 50%;
  animation: orb-spin 0.85s linear infinite;
}
@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .orb-spin {
    animation: none;
  }
}
</style>
