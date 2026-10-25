<template>
  <section class="demo">
    <h3>Extreme: panels open and their rows stagger in (GSAP)</h3>
    <p class="note">
      With <code>:motion="false"</code>, Accordion leaves the panel height and the chevron to you,
      and you animate each item’s exposed <code>panelEl</code> and <code>chevronEl</code>. The
      opening panel grows to its full height while its rows fade up one after another, and the
      chevron turns with it. One timeline opens one item and closes the other, so the list’s total
      height changes smoothly.
    </p>
    <Accordion v-model:value="openItem" :motion="false" class="reveal-accordion">
      <AccordionItem
        v-for="section in sections"
        :key="section.value"
        :ref="(item) => track(section.value, item)"
        :value="section.value"
        :title="section.title"
        :ui="{ panel: 'reveal-panel' }"
      >
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

type ItemHandle = { panelEl: HTMLElement | null; chevronEl: SVGSVGElement | null }
const items = new Map<string, ItemHandle>()
function track(value: string, item: unknown) {
  if (item) items.set(value, item as ItemHandle)
  else items.delete(value)
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const rowsOf = (panel: HTMLElement) => panel.querySelectorAll<HTMLElement>('[data-reveal]')

// Chevron angles live here, not in GSAP's transform cache, so an interrupted turn resumes from
// the angle on screen. The chevron rests on its CSS `transform`, which the draw overrides inline.
const angle = new Map<string, number>()
const moving = new Set<string>()
let reveal: gsap.core.Timeline | null = null

function release(value: string) {
  const panel = items.get(value)?.panelEl
  if (panel) {
    for (const prop of ['height', 'overflow', 'visibility']) panel.style.removeProperty(prop)
    gsap.set(rowsOf(panel), { clearProps: 'opacity,transform' })
  }
  items.get(value)?.chevronEl?.style.removeProperty('transform')
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

  // One pace both ways, as Accordion's own motion. In a swap both heights share it, so the growing
  // and shrinking panels always add up to a smooth total.
  const heightDuration = 0.3
  const tl = gsap.timeline({ onComplete: () => involved.forEach(release) })

  for (const value of involved) {
    const panel = items.get(value)?.panelEl
    const chevron = items.get(value)?.chevronEl
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
      chevron.style.transform = `rotate(${turn.deg}deg)`
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
.reveal-rows {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
