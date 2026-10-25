<template>
  <section class="demo">
    <h3>Extreme: an elastic orb (GSAP)</h3>
    <p class="note">
      The <code>#indicator</code> slot receives the pull's <code>state</code> and
      <code>progress</code>, and the demo watches the exposed <code>state</code> to run GSAP. While
      you pull, a ring fills with your finger. Past the threshold, the orb springs and the arrow
      flips; refreshing spins it, and finishing draws a check with a pulse.
    </p>
    <PullToRefresh ref="ptr" class="ptr-box" :on-refresh="refresh">
      <template #indicator="{ state, progress }">
        <div :ref="(el) => (orb = el as HTMLElement | null)" class="orb" :data-state="state">
          <svg class="orb-svg" viewBox="0 0 48 48" aria-hidden="true">
            <circle class="orb-track" cx="24" cy="24" r="20" />
            <circle
              :ref="(el) => (ring = el as SVGCircleElement | null)"
              class="orb-ring"
              cx="24"
              cy="24"
              r="20"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="CIRCUMFERENCE * (1 - progress)"
              transform="rotate(-90 24 24)"
            />
            <g :ref="(el) => (arrow = el as SVGGElement | null)" class="orb-arrow">
              <path d="M24 15v16M17 25l7 7 7-7" />
            </g>
            <path
              :ref="(el) => (check = el as SVGPathElement | null)"
              class="orb-check"
              d="M15.5 25.5l6 6 11-13"
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
import { gsap } from 'gsap'
import { PullToRefresh } from 'vael-ui'

const CIRCUMFERENCE = 2 * Math.PI * 20
const ptr = useTemplateRef('ptr')
let orb = null as HTMLElement | null
let ring = null as SVGCircleElement | null
let arrow = null as SVGGElement | null
let check = null as SVGPathElement | null

const rows = shallowRef([
  'Design review',
  'Standup notes',
  'Release checklist',
  'Invoices',
  'Travel',
  'Reading list',
])
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches

async function refresh() {
  await new Promise((resolve) => setTimeout(resolve, 1400))
  rows.value = [`New: ${new Date().toLocaleTimeString()}`, ...rows.value]
}

let spin: gsap.core.Tween | null = null
// The orb's state changes drive its motion; the pull itself (the ring) follows your finger directly.
watch(
  () => ptr.value?.state,
  (state, previous) => {
    if (!orb || !ring || !arrow || !check || reduce()) return
    spin?.kill()
    if (state === 'ready') {
      gsap.fromTo(
        orb,
        { scale: 1 },
        {
          keyframes: { scale: [1.28, 1], easeEach: 'power2.out' },
          duration: 0.55,
          ease: 'elastic.out(1, 0.4)',
        },
      )
      gsap.to(arrow, {
        rotation: 180,
        transformOrigin: '50% 50%',
        duration: 0.6,
        ease: 'elastic.out(1, 0.45)',
      })
    } else if (state === 'pulling' || state === 'idle') {
      gsap.to(arrow, {
        rotation: 0,
        opacity: 1,
        scale: 1,
        transformOrigin: '50% 50%',
        duration: 0.3,
        ease: 'power3.out',
      })
      gsap.set([ring, orb], { clearProps: 'strokeDashoffset,rotation,opacity' })
      gsap.set(check, { opacity: 0 })
    } else if (state === 'loading') {
      gsap.to(arrow, {
        opacity: 0,
        scale: 0.4,
        transformOrigin: '50% 50%',
        duration: 0.2,
        ease: 'power2.in',
      })
      // A short arc that orbits, in place of the progress ring.
      gsap.to(ring, { strokeDashoffset: CIRCUMFERENCE * 0.72, duration: 0.3, ease: 'power2.out' })
      spin = gsap.to(orb, {
        rotation: 360,
        duration: 0.85,
        ease: 'none',
        repeat: -1,
        transformOrigin: '50% 50%',
      })
    } else if (state === 'done') {
      gsap.set(orb, { rotation: 0 })
      gsap.to(ring, { strokeDashoffset: 0, duration: 0.25, ease: 'power2.out' })
      const length = check.getTotalLength()
      gsap.fromTo(
        check,
        { opacity: 1, strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out', delay: 0.1 },
      )
      gsap.fromTo(
        orb,
        { scale: 1 },
        {
          keyframes: { scale: [1.2, 1], easeEach: 'power2.out' },
          duration: 0.6,
          ease: 'elastic.out(1, 0.4)',
          delay: 0.2,
        },
      )
    }
    void previous
  },
)
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
.orb-arrow path,
.orb-check {
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.orb-check {
  opacity: 0;
}
</style>
