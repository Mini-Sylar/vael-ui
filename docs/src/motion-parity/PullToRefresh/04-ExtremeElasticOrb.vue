<template>
  <section class="demo">
    <h3>Extreme: an elastic orb</h3>
    <p class="note">
      The <code>#indicator</code> slot receives the pull's <code>state</code> and
      <code>progress</code>. While you pull, a ring fills with your finger. Each part has a
      <code>v-animate</code> whose <code>replay</code> follows the state: crossing the threshold
      blips the orb and flips the arrow on an elastic curve, refreshing fades the arrow and spins
      the orb (an <code>animate</code> turn that loops with <code>repeat</code>), and finishing
      draws a check with a pulse.
    </p>
    <PullToRefresh ref="ptr" class="ptr-box" :on-refresh="refresh">
      <template #indicator="{ state, progress }">
        <div v-animate="orbMotion" class="orb">
          <svg v-animate="spin" class="orb-svg" viewBox="0 0 48 48" aria-hidden="true">
            <circle class="orb-track" cx="24" cy="24" r="20" />
            <circle
              v-animate="ringMotion"
              class="orb-ring"
              cx="24"
              cy="24"
              r="20"
              :stroke-dasharray="CIRCUMFERENCE"
              :style="{ strokeDashoffset: CIRCUMFERENCE * (1 - ringFill(state, progress)) }"
              transform="rotate(-90 24 24)"
            />
            <g v-animate="arrowMotion" class="orb-arrow" :style="arrowLook(state)">
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
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { PullToRefresh, vAnimate } from 'vael-ui'
import type { AnimateDirectiveValue, PullToRefreshState, TargetMotion } from 'vael-ui'

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

// GSAP's elastic.out(1, 0.45) as a CSS easing; power2/power3 out as beziers.
const elastic = `linear(${Array.from({ length: 61 }, (_, i) => {
  const p = i / 60
  return p === 1
    ? 1
    : +(2 ** (-10 * p) * Math.sin(((p - 0.1125) * 2 * Math.PI) / 0.45) + 1).toFixed(4)
}).join(', ')})`
const POWER2_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)'
const POWER3_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
const POWER2_IN = 'cubic-bezier(0.32, 0, 0.67, 0)'

// The ring follows your finger while pulling; refreshing it is a short arc, done it is whole.
function ringFill(state: string, progress: number) {
  if (state === 'loading') return 0.28
  if (state === 'done') return 1
  return progress
}
// The arrow's resting look per state: flipped past the threshold, shrunk away while refreshing.
function arrowLook(state: string) {
  if (state === 'ready') return { rotate: '180deg' }
  if (state === 'loading') return { rotate: '180deg', opacity: 0, scale: 0.4 }
  if (state === 'done') return { opacity: 0 }
  return {}
}

// Each change of state replays the part's `initial`, from where it was to its new look.
const state = shallowRef<PullToRefreshState>('idle')
const before = shallowRef<PullToRefreshState>('idle')
const turn = shallowRef(0)
watch(
  () => ptr.value?.state,
  (next, previous) => {
    if (!next) return
    before.value = previous ?? 'idle'
    state.value = next
    turn.value++
  },
)

// A quick blip as the threshold is crossed, and another as it finishes.
const orbMotion = computed<TargetMotion>(() => {
  if (state.value === 'ready')
    return { replay: turn.value, initial: { scale: 1.28 }, duration: 40, easing: POWER2_OUT }
  if (state.value === 'done')
    return {
      replay: turn.value,
      initial: { scale: { value: [1, 1.2, 1], duration: 60, delay: 0.2 } },
    }
  return {}
})
const arrowMotion = computed<TargetMotion>(() => {
  const s = state.value
  if (s === 'ready')
    return { replay: turn.value, initial: { rotate: 0 }, duration: 600, easing: elastic }
  if (s === 'loading')
    return {
      replay: turn.value,
      initial: { opacity: 1, scale: 1 },
      duration: 200,
      easing: POWER2_IN,
    }
  // Back from the threshold, or back after a refresh: it turns home and shows again.
  if ((s === 'pulling' || s === 'idle') && (before.value === 'ready' || before.value === 'done'))
    return {
      replay: turn.value,
      initial: { rotate: 180, opacity: before.value === 'done' ? 0 : 1 },
      duration: 300,
      easing: POWER3_OUT,
    }
  return {}
})
// Refreshing shrinks the ring to an arc; finishing closes it.
const ringMotion = computed<TargetMotion>(() => {
  const at = (fill: number, duration: number) => ({
    replay: turn.value,
    initial: {
      strokeDashoffset: { value: CIRCUMFERENCE * (1 - fill), duration, easing: POWER2_OUT },
    },
  })
  if (state.value === 'loading') return at(1, 300)
  if (state.value === 'done') return at(0.28, 250)
  return {}
})

// Refreshing, the orb turns once every 850ms until it's done, then stands straight at once.
const spin = computed<AnimateDirectiveValue>(() => ({
  animate:
    state.value === 'loading'
      ? { rotate: { value: [0, 360], duration: 850, easing: 'linear', repeat: Infinity } }
      : { rotate: { value: 0, duration: 0 } },
}))

// The check draws itself in the moment it appears, and goes at once.
const draw: TargetMotion = {
  initial: { strokeDashoffset: { value: 1, duration: 350, easing: POWER2_OUT, delay: 0.1 } },
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
