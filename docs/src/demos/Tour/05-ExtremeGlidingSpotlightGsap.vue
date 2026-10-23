<template>
  <section class="demo">
    <h3>Extreme: the spotlight glides between steps (GSAP)</h3>
    <p class="note">
      With <code>:motion="false"</code> Tour's own glide is off and the cutout jumps to each target.
      On every <code>@step-change</code>, one GSAP timeline carries the exposed
      <code>spotlightEl</code> from the old target to the new one. Its position, size and corner
      radius morph together, and <code>panelEl</code> rides along on the same progress value. Press
      Next or Back mid-glide and it turns from where it is.
    </p>
    <div class="row">
      <Button @click="open = true">Start tour</Button>
    </div>
    <div class="glide-app">
      <div class="glide-bar">
        <Avatar id="glide-avatar" name="Ama Mensah" />
        <Button id="glide-new" size="sm">New project</Button>
      </div>
      <Card
        id="glide-card"
        class="glide-card"
        title="Weekly report"
        description="Sales, signups and churn for the last seven days."
      />
    </div>
    <Tour ref="tour" v-model:open="open" :steps="steps" :motion="false" @step-change="glide" />
    <Teleport to="body">
      <div ref="ring" class="glide-ring" aria-hidden="true" />
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Avatar, Button, Card, Tour } from 'vael-ui'
import type { TourStep, TourStepChangeDetails } from 'vael-ui'

const open = shallowRef(false)
const steps: TourStep[] = [
  {
    target: '#glide-avatar',
    title: 'Your profile',
    description: 'Change your photo, name and notification settings.',
    spotlightPadding: 4,
    spotlightRadius: 999,
  },
  {
    target: '#glide-new',
    title: 'Start something',
    description: 'Projects hold your reports, files and the people you share them with.',
    spotlightPadding: 4,
    spotlightRadius: 8,
  },
  {
    target: '#glide-card',
    side: 'top',
    title: 'Your weekly report',
    description: 'It refreshes every Monday morning.',
    spotlightPadding: 8,
    spotlightRadius: 20,
  },
]

const tour = useTemplateRef('tour')
const ring = useTemplateRef('ring')

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches

type Box = { x: number; y: number; w: number; h: number; r: number }

// The cutout Tour draws for a step at rest: the target's box plus padding, radius clamped to fit.
function cutoutFor(step: TourStep): Box | null {
  const el = typeof step.target === 'string' ? document.querySelector(step.target) : step.target
  if (!(el instanceof Element)) return null
  const rect = el.getBoundingClientRect()
  const pad = step.spotlightPadding ?? 4
  const w = rect.width + pad * 2
  const h = rect.height + pad * 2
  const r = Math.min(step.spotlightRadius ?? 8, w / 2, h / 2)
  return { x: rect.left - pad, y: rect.top - pad, w, h, r }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function toPath({ x, y, w, h, r }: Box) {
  const [vw, vh] = [window.innerWidth, window.innerHeight]
  return (
    `path(evenodd, "M0,0 H${vw} V${vh} H0 Z ` +
    `M${x + r},${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w},${y + r} ` +
    `V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r},${y + h} ` +
    `H${x + r} A${r} ${r} 0 0 1 ${x},${y + h - r} ` +
    `V${y + r} A${r} ${r} 0 0 1 ${x + r},${y} Z")`
  )
}

let timeline: gsap.core.Timeline | null = null
// What's on screen right now, so a step change mid-glide starts from here.
let shown: Box | null = null
let ringOpacity = 0
// The elements we wrote inline styles on, to clean up even after Tour unmounts them.
let touched: { spotlight: HTMLElement; panel: HTMLElement } | null = null
// The positioner lands on its new spot after GSAP's frame, before the paint: redraw right then,
// or the panel shows there for one frame.
let follow: MutationObserver | null = null

// An inline clip-path wins over Tour's own cutout. Removing it hands the spotlight back to Tour.
function release() {
  timeline?.kill()
  timeline = null
  follow?.disconnect()
  follow = null
  shown = null
  ringOpacity = 0
  ring.value?.removeAttribute('style')
  touched?.spotlight.style.removeProperty('clip-path')
  touched?.panel.style.removeProperty('translate')
  touched = null
}

// Fires before Vue re-renders, so the spotlight and panel still show the previous step.
function glide({ step, previousStep, reason }: TourStepChangeDetails) {
  const spotlight = tour.value?.spotlightEl
  const panel = tour.value?.panelEl
  const positioner = tour.value?.positionerEl
  const from = shown ?? (previousStep && cutoutFor(previousStep))
  if (
    reason === 'open' ||
    !from ||
    !spotlight ||
    !panel ||
    !positioner ||
    !ring.value ||
    reduce()
  ) {
    release()
    return
  }
  timeline?.kill()
  touched = { spotlight, panel }
  const ringEl = ring.value
  // Where the panel is now, glide offset included. The positioner moves to the new step's spot
  // before the next frame, and the panel's offset from there shrinks to zero.
  const panelFrom = panel.getBoundingClientRect()
  const state = { p: 0, ring: ringOpacity }
  const draw = () => {
    const to = cutoutFor(step)
    if (!to) return
    const box: Box = {
      x: lerp(from.x, to.x, state.p),
      y: lerp(from.y, to.y, state.p),
      w: lerp(from.w, to.w, state.p),
      h: lerp(from.h, to.h, state.p),
      r: lerp(from.r, to.r, state.p),
    }
    shown = box
    ringOpacity = state.ring
    spotlight.style.clipPath = toPath(box)
    Object.assign(ringEl.style, {
      display: 'block',
      zIndex: getComputedStyle(spotlight).zIndex,
      opacity: String(state.ring),
      translate: `${box.x}px ${box.y}px`,
      width: `${box.w}px`,
      height: `${box.h}px`,
      borderRadius: `${box.r}px`,
    })
    const rest = positioner.getBoundingClientRect()
    const dx = (panelFrom.left - rest.left) * (1 - state.p)
    const dy = (panelFrom.top - rest.top) * (1 - state.p)
    panel.style.translate = `${dx}px ${dy}px`
  }
  draw()
  follow?.disconnect()
  follow = new MutationObserver(draw)
  follow.observe(positioner, { attributes: true, attributeFilter: ['style'] })

  timeline = gsap
    .timeline({ onUpdate: draw, onComplete: release })
    .to(state, { p: 1, duration: 0.42, ease: 'power3.inOut' }, 0)
    // The ring only shows while the cutout travels, so the rest state matches Tour's own.
    .to(state, { keyframes: { ring: [1, 1, 0] }, duration: 0.42, ease: 'none' }, 0)
}

watch(open, (isOpen) => {
  if (!isOpen) release()
})
onUnmounted(release)
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-block-end: 1rem;
}
.glide-app {
  display: grid;
  gap: 1.5rem;
  max-inline-size: 32rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.glide-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.glide-card {
  justify-self: end;
  max-inline-size: 16rem;
}
/* Teleported after Tour's own layers, so at the spotlight's z-index it paints above the dim
   and below the panel. */
.glide-ring {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  box-sizing: border-box;
  border: 2px solid var(--ui-primary);
}
</style>
