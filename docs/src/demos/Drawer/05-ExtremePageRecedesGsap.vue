<template>
  <section class="demo">
    <h3>Extreme: the page recedes behind the sheet (GSAP)</h3>
    <p class="note">
      The <code>motion</code> prop's <code>enter</code> and <code>leave</code> hooks hand the panel
      to GSAP. One tween drives a single progress value, and each frame it places the panel and the
      page behind it: the page shrinks, rounds and dims as the sheet rises, and both reverse
      together on close. The drawer waits for the returned tween before it unmounts.
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
      <Drawer
        v-model:open="open"
        :container="stage"
        side="bottom"
        :motion="sheetMotion"
        :ui="sheetUi"
        title="Share trip"
        description="Anyone with the link can view the itinerary."
      >
        <div class="share">
          <Button v-for="target in targets" :key="target" variant="outline" size="sm">
            {{ target }}
          </Button>
        </div>
      </Drawer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { Button, Drawer } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

gsap.registerPlugin(CustomEase)
// The iOS sheet curve: a fast start that glides to a long, soft stop.
const sheetEase = CustomEase.create('ios-sheet', '0.32, 0.72, 0, 1')

const stops = [
  { time: '09:00', label: 'Pastéis at Manteigaria' },
  { time: '11:30', label: 'Tram 28 to Alfama' },
  { time: '14:00', label: 'Lunch in Príncipe Real' },
  { time: '18:45', label: 'Sunset at Miradouro' },
]
const targets = ['Messages', 'Mail', 'Copy link']

const stage = useTemplateRef('stage')
const page = useTemplateRef('page')
const open = shallowRef(false)

// The scrim would fade on its own CSS timer, so it goes clear and the page dims itself instead.
const sheetUi = { overlay: { style: { background: 'transparent' } } }

// 0 is closed, 1 is open. Interrupting a tween leaves it wherever it was on screen.
const state = { progress: 0 }

// From its resting spot to fully below the stage, its gap and shadow included, so no shadow peeks
// over the bottom edge while it is closed.
const SHADOW = 32
const offscreen = (panel: HTMLElement) =>
  (panel.offsetParent?.clientHeight ?? 0) - panel.offsetTop + SHADOW

// The sheet and the page both read the same number each frame, so they can't drift apart.
function draw(panel: HTMLElement) {
  const card = page.value
  if (!card) return
  const t = state.progress
  panel.style.transform = `translateY(${(1 - t) * offscreen(panel)}px)`
  card.style.transform = `translateY(${t * 12}px) scale(${1 - t * 0.06})`
  card.style.borderRadius = `${t * 14}px`
  card.style.setProperty('--dim', String(t * 0.35))
}

const PAGE_STYLES = ['transform', 'border-radius', '--dim']

function slide(panel: HTMLElement, to: 0 | 1) {
  // Paint the starting frame now, before the browser shows the sheet at its resting spot.
  draw(panel)
  return gsap.to(state, {
    progress: to,
    duration: to ? 0.48 : 0.3,
    ease: sheetEase,
    onUpdate: () => draw(panel),
    onComplete: () => {
      // Open, the panel goes back to its own styles; closed, the page does.
      if (to) panel.style.removeProperty('transform')
      else for (const prop of PAGE_STYLES) page.value?.style.removeProperty(prop)
    },
  })
}

const sheetMotion: DialogMotion = {
  enter: ({ panel }) => slide(panel, 1),
  leave: ({ panel }) => slide(panel, 0),
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

.share {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
