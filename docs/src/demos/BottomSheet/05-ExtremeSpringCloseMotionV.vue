<template>
  <section class="demo">
    <h3>Extreme: a spring close that keeps your flick (motion-v)</h3>
    <p class="note">
      <code>before-close</code> hands the exit to a motion-v spring on the exposed
      <code>panelEl</code>. A flick starts it at <code>releaseVelocity</code>, so the sheet keeps
      your finger's momentum. The page behind recedes with the sheet's position, drag included.
    </p>
    <div ref="stage" class="stage">
      <article ref="page" class="page">
        <header class="page-head">
          <p class="page-eyebrow">Trip</p>
          <h4 class="page-title">A weekend in Lisbon</h4>
        </header>
        <ul class="page-list">
          <li v-for="stop in stops" :key="stop.time">
            <span class="page-time">{{ stop.time }}</span>
            <span>{{ stop.label }}</span>
          </li>
        </ul>
        <Button class="page-action" size="sm" @click="open = true">Share trip</Button>
      </article>
      <BottomSheet
        ref="sheet"
        v-model:open="open"
        :container="stage"
        title="Share trip"
        aria-label="Share trip"
        :snap-points="[{ id: 'peek', height: SNAP }]"
        :before-close="springClose"
        :ui="sheetUi"
      >
        <template #default="{ close }">
          <p class="sheet-lede">
            Lisbon, 12 to 16 May. Anyone with the link can view the itinerary.
          </p>
          <Button variant="outline" class="sheet-action" @click="close">Done</Button>
        </template>
      </BottomSheet>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { animate } from 'motion-v'
import type { AnimationPlaybackControls } from 'motion-v'
import { Button, BottomSheet } from 'vael-ui'

const SNAP = 0.55
const stops = [
  { time: '09:00', label: 'Pastéis at Manteigaria' },
  { time: '11:30', label: 'Tram 28 to Alfama' },
  { time: '14:00', label: 'Lunch in Príncipe Real' },
  { time: '18:45', label: 'Sunset at Miradouro' },
]

const open = shallowRef(false)
const sheet = useTemplateRef('sheet')
const stage = useTemplateRef('stage')
const page = useTemplateRef('page')

// The scrim would fade on its own CSS timer, so it goes clear and the page dims itself instead.
const sheetUi = { overlay: { style: { background: 'transparent' } } }

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const offsetOf = (panel: HTMLElement) => new DOMMatrix(getComputedStyle(panel).transform).m42
let spring: AnimationPlaybackControls | null = null

// The page reads one number: how far the sheet sits between closed (0) and its rest (1).
// The panel is as tall as the stage, so translateY(100%) is closed and the snap height sets the rest.
function progressOf(panel: HTMLElement) {
  const closed = panel.offsetHeight
  // Hidden once closed, so there is no box left to measure.
  if (!closed) return 0
  const rest = closed * (1 - SNAP)
  return Math.min(1, Math.max(0, (closed - offsetOf(panel)) / (closed - rest)))
}

function drawPage(t: number) {
  const card = page.value
  if (!card) return
  if (t === 0) {
    for (const prop of ['transform', 'border-radius', '--dim']) card.style.removeProperty(prop)
    return
  }
  card.style.transform = `scale(${1 - t * 0.06})`
  card.style.borderRadius = `${t * 14}px`
  card.style.setProperty('--dim', String(t * 0.35))
}

// Runs only while the sheet moves. It stops after a few still frames at rest or closed, and
// wakes again on a drag or a close.
let frame = 0
let last = -1
let still = 0
function tick() {
  const panel = sheet.value?.panelEl
  if (!panel) return stop()
  const t = progressOf(panel)
  drawPage(t)
  still = Math.abs(t - last) < 0.0005 ? still + 1 : 0
  last = t
  const busy = sheet.value?.isDragging || sheet.value?.isClosing
  if ((still > 8 && !busy) || (t === 0 && !open.value)) return stop()
  frame = requestAnimationFrame(tick)
}
function wake() {
  if (frame) return
  still = 0
  frame = requestAnimationFrame(tick)
}
function stop() {
  cancelAnimationFrame(frame)
  frame = 0
}
watch(open, wake)
watch(() => sheet.value?.isClosing, wake)
useEventListener(() => sheet.value?.panelEl, 'pointerdown', wake)
onScopeDispose(() => {
  spring?.stop()
  stop()
})

function springClose(): Promise<boolean> {
  // Resolves true once the exit has finished, which lets the close through.
  return new Promise((resolve) => {
    const done = () => resolve(true)
    const panel = sheet.value?.panelEl
    spring?.stop()
    if (!panel || reduce()) return done()
    // Mid-rise or mid-settle, the computed transform is where the panel is on screen. Pin it there
    // before the spring's first frame, or turning the transition off jumps it to the old target.
    const from = offsetOf(panel)
    panel.style.transition = 'none'
    panel.style.transform = `translateY(${from}px)`
    // A duration-based spring drops the velocity you give it, so this one is set by stiffness and
    // damping instead: critically damped (damping = 2√stiffness), done in about 350ms from rest.
    spring = animate(from, panel.offsetHeight, {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      // Stop within half a pixel of closed, not after a sub-pixel tail the eye can't see.
      restDelta: 0.5,
      restSpeed: 20,
      // px/ms from BottomSheet, px/s for motion-v. It's 0 for any close that isn't a flick.
      velocity: (sheet.value?.releaseVelocity ?? 0) * 1000,
      onUpdate: (y) => (panel.style.transform = `translateY(${y}px)`),
      // Ends on translateY(100%), the transform BottomSheet uses for closed, so it takes over cleanly.
      onComplete: () => {
        spring = null
        done()
      },
    })
  })
}
</script>

<style scoped>
.stage {
  position: relative;
  overflow: hidden;
  block-size: 24rem;
  max-inline-size: 22rem;
  border-radius: 1.25rem;
  background: oklch(0.16 0 0);
}

.page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--ui-surface);
  transform-origin: center top;
}

/* Dims the page from one custom property, so the shade moves with the rest of the frame. */
.page::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: black;
  opacity: var(--dim, 0);
  pointer-events: none;
}

.page-head {
  display: grid;
  gap: 0.25rem;
}

.page-eyebrow {
  margin: 0;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
}

.page-list {
  display: grid;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
}

.page-list li {
  display: flex;
  gap: 0.75rem;
}

.page-time {
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}

.page-action {
  align-self: flex-start;
  margin-block-start: auto;
}

.sheet-lede {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}

.sheet-action {
  inline-size: 100%;
}
</style>
