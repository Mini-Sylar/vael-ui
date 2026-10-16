<template>
  <section class="demo">
    <h3>Extreme: panels open and their rows stagger in (GSAP)</h3>
    <p class="note">
      <code>:motion-css="false"</code> on Accordion hands the panel height over, and each item's
      exposed <code>panelEl</code> is what you animate. The opening panel grows to its full height
      while its rows fade up one after another, and the <code>#trigger</code> slot's chevron turns
      in step. Opening one item closes the other in the same timeline, so the list height moves as
      one.
    </p>
    <Accordion v-model:value="openItem" :motion-css="false" class="reveal-accordion">
      <AccordionItem
        v-for="section in sections"
        :key="section.value"
        :ref="(item) => track(section.value, item)"
        :value="section.value"
        :ui="{ panel: 'reveal-panel' }"
      >
        <template #trigger="{ open }">
          <span class="reveal-title">{{ section.title }}</span>
          <svg
            :ref="(el) => trackChevron(section.value, el)"
            class="reveal-chevron"
            :class="{ 'is-open': open }"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </template>
        <ul class="reveal-rows">
          <li v-for="row in section.rows" :key="row" data-reveal>{{ row }}</li>
        </ul>
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Accordion, AccordionItem } from 'vael-ui'

const sections = [
  {
    value: 'shipping',
    title: 'Shipping',
    rows: ['Free over $50', 'Ships in 1 to 2 days', 'Tracking sent by email'],
  },
  {
    value: 'returns',
    title: 'Returns',
    rows: ['30 days, no questions', 'Prepaid label in the box', 'Refunds land in 3 days'],
  },
  {
    value: 'warranty',
    title: 'Warranty',
    rows: ['Two years on parts', 'Repairs or a replacement', 'Covers drops in year one'],
  },
]
const openItem = shallowRef<string | null>('shipping')

type ItemHandle = { panelEl: HTMLElement | null }
const items = new Map<string, ItemHandle>()
const chevrons = new Map<string, SVGElement>()
function track(value: string, item: unknown) {
  if (item) items.set(value, item as ItemHandle)
  else items.delete(value)
}
function trackChevron(value: string, el: unknown) {
  if (el) chevrons.set(value, el as SVGElement)
  else chevrons.delete(value)
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const rowsOf = (panel: HTMLElement) => panel.querySelectorAll<HTMLElement>('[data-reveal]')

// Chevron angles live here, not in GSAP's transform cache, so an interrupted turn resumes from
// the angle on screen. The chevron rests on its CSS `rotate`, which the draw overrides inline.
const angle = new Map<string, number>()
const moving = new Set<string>()
let reveal: gsap.core.Timeline | null = null

function release(value: string) {
  const panel = items.get(value)?.panelEl
  if (panel) {
    for (const prop of ['height', 'overflow', 'visibility']) panel.style.removeProperty(prop)
    gsap.set(rowsOf(panel), { clearProps: 'opacity,transform' })
  }
  chevrons.get(value)?.style.removeProperty('rotate')
  angle.delete(value)
  moving.delete(value)
}

// Runs before Vue patches the DOM, so panel heights are still what's on screen.
watch(openItem, async (next, prev) => {
  // Anything still mid-flight joins the new timeline, so nothing freezes halfway.
  const involved = sections
    .map((s) => s.value)
    .filter((v) => v === next || v === prev || moving.has(v))
  const from = new Map<string, { height: number; angle: number }>()
  for (const value of involved) {
    const panel = items.get(value)?.panelEl
    const wasOpen = value === prev
    from.set(value, {
      height: panel?.getBoundingClientRect().height ?? 0,
      angle: angle.get(value) ?? (wasOpen ? 180 : 0),
    })
  }
  reveal?.kill()
  reveal = null
  if (reduce()) {
    involved.forEach(release)
    return
  }
  await nextTick()

  const opening = next !== null
  // A lone close runs faster. In a swap both heights share one duration and ease, so the
  // growing and shrinking panels always add up to a smooth total.
  const heightDuration = opening ? 0.3 : 0.2
  const tl = gsap.timeline({ onComplete: () => involved.forEach(release) })

  for (const value of involved) {
    const panel = items.get(value)?.panelEl
    const chevron = chevrons.get(value)
    const start = from.get(value)
    if (!panel || !chevron || !start) continue
    const open = value === next
    const rows = rowsOf(panel)
    moving.add(value)

    // Closed panels stay inert and hidden by the class rule; keep this one painted while it shrinks.
    panel.style.overflow = 'hidden'
    panel.style.visibility = 'visible'
    panel.style.height = `${start.height}px`
    const turn = { deg: start.angle }
    const draw = () => {
      chevron.style.rotate = `${turn.deg}deg`
      angle.set(value, turn.deg)
    }
    draw()

    // The body's own height keeps the fraction scrollHeight rounds off, so the hand-back to auto lands exactly.
    const full = panel.firstElementChild?.getBoundingClientRect().height ?? panel.scrollHeight
    tl.to(
      panel,
      {
        height: open ? full : 0,
        duration: heightDuration,
        ease: 'power3.out',
        // GSAP rounds px by default; the fraction keeps the summed height steady in a swap.
        autoRound: false,
      },
      0,
    ).to(
      turn,
      { deg: open ? 180 : 0, duration: heightDuration, ease: 'power3.out', onUpdate: draw },
      0,
    )

    if (open) {
      // Fresh opens start the rows hidden; an interrupted one picks up from their inline values.
      if (start.height === 0) gsap.set(rows, { opacity: 0, y: 8 })
      tl.to(
        rows,
        { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', stagger: 0.04, overwrite: true },
        0.05,
      )
    }
  }
  reveal = tl
})
</script>

<style scoped>
.reveal-accordion {
  max-width: 32rem;
  margin-block-end: 1.5rem;
}
.reveal-accordion :deep(.reveal-panel[data-state='closed']) {
  height: 0;
  overflow: hidden;
  visibility: hidden;
}
.reveal-title {
  flex: 1 1 auto;
}
.reveal-chevron {
  flex: none;
  color: var(--ui-text-muted);
}
.reveal-chevron.is-open {
  rotate: 180deg;
}
.reveal-rows {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
