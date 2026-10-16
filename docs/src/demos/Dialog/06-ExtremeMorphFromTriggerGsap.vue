<template>
  <section class="demo">
    <h3>Extreme: the dialog morphs out of its button (GSAP)</h3>
    <p class="note">
      <code>force-mount</code> hands you the exposed <code>panelEl</code> and
      <code>overlayEl</code>. The panel grows out of the button and the backdrop fades on the same
      progress. <code>before-close(done)</code> shrinks it back into the button.
    </p>
    <Button ref="trigger" @click="openFromTrigger">Invite teammates</Button>

    <Dialog
      ref="dialog"
      v-model:open="open"
      force-mount
      size="sm"
      :before-close="shrinkIntoTrigger"
      title="Invite teammates"
      description="They get an email with a link to join this workspace."
    >
      <Input v-model="email" type="email" aria-label="Email" placeholder="name@company.com" />
      <template #footer="{ close }">
        <Button variant="secondary" @click="close()">Cancel</Button>
        <Button @click="close()">Send invite</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Button, Dialog, Input } from 'vael-ui'

const open = shallowRef(false)
const email = shallowRef('')
const dialog = useTemplateRef('dialog')
const trigger = useTemplateRef('trigger')

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
// How far the clip reaches past the panel at rest, so its shadow isn't cut off.
const SHADOW = 48
// One state for the whole morph, so a reversal starts from what is on screen.
const state = { progress: 0, content: 0 }
let morph: gsap.core.Timeline | null = null

type Geometry = {
  panel: HTMLElement
  overlay: HTMLElement | null
  dx: number
  dy: number
  insetX: number
  insetY: number
  fromRadius: number
  toRadius: number
  fromColor: string
}

// No scale, so text never stretches: the panel slides from the button while a clip window grows.
function measure(): Geometry | null {
  const panel = dialog.value?.panelEl
  const button = (trigger.value as { el?: HTMLElement } | null)?.el
  if (!panel || !button) return null
  // Measure the panel where it rests, not where a running morph has moved it.
  const translate = panel.style.translate
  panel.style.translate = ''
  const p = panel.getBoundingClientRect()
  panel.style.translate = translate
  const t = button.getBoundingClientRect()
  const buttonStyle = getComputedStyle(button)
  return {
    panel,
    overlay: dialog.value?.overlayEl ?? null,
    dx: t.left + t.width / 2 - (p.left + p.width / 2),
    dy: t.top + t.height / 2 - (p.top + p.height / 2),
    insetX: (p.width - t.width) / 2,
    insetY: (p.height - t.height) / 2,
    fromRadius: parseFloat(buttonStyle.borderTopLeftRadius) || 0,
    toRadius: parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0,
    fromColor: buttonStyle.backgroundColor,
  }
}

function draw(g: Geometry) {
  const { panel, overlay } = g
  const p = state.progress
  const x = g.insetX + (-SHADOW - g.insetX) * p
  const y = g.insetY + (-SHADOW - g.insetY) * p
  // Once the clip passes the panel's edge, the panel's own corners take over; widen the clip's
  // corners by the overshoot so they don't cut into the shadow.
  const radius = g.fromRadius + (g.toRadius - g.fromRadius) * p + Math.max(0, -Math.min(x, y))
  panel.style.translate = `${g.dx * (1 - p)}px ${g.dy * (1 - p)}px`
  panel.style.clipPath = `inset(${y}px ${x}px round ${radius}px)`
  // The button's color hands over to the surface in the first half of the trip.
  const tint = Math.max(0, 1 - p * 2) * 100
  panel.style.backgroundColor = `color-mix(in srgb, ${g.fromColor} ${tint}%, var(--ui-surface))`
  for (const child of panel.children) (child as HTMLElement).style.opacity = String(state.content)
  // An inline opacity takes the backdrop off Dialog's CSS fade and onto this timeline.
  if (overlay) overlay.style.opacity = String(p)
}

function release(g: Geometry) {
  for (const prop of ['translate', 'clip-path', 'background-color']) {
    g.panel.style.removeProperty(prop)
  }
  for (const child of g.panel.children) (child as HTMLElement).style.removeProperty('opacity')
  g.overlay?.style.removeProperty('opacity')
}

async function openFromTrigger() {
  // The overlay covers the button, but a programmatic click can still land mid-close.
  if (dialog.value?.isClosing) dialog.value.cancelClose()
  const fresh = !open.value
  open.value = true
  await nextTick()
  if (reduce()) return
  const g = measure()
  if (!g) return
  morph?.kill()
  if (fresh) state.progress = state.content = 0
  draw(g)
  // Shorter when it is already part of the way open.
  const left = 1 - state.progress
  morph = gsap
    .timeline({
      defaults: { ease: 'power3.out' },
      onUpdate: () => draw(g),
      onComplete: () => release(g),
    })
    .to(state, { progress: 1, duration: 0.15 + 0.3 * left }, 0)
    .to(state, { content: 1, duration: 0.2 }, 0.12 * left)
}

function shrinkIntoTrigger(done: () => void) {
  const g = reduce() ? null : measure()
  if (!g) return done()
  morph?.kill()
  // A panel at rest has no inline styles; pick up from the fully open state.
  if (!g.panel.style.clipPath) state.progress = state.content = 1
  draw(g)
  morph = gsap
    .timeline({
      onUpdate: () => draw(g),
      onComplete: () => {
        done()
        // The panel hides before the next paint, so clearing here can't flash it.
        release(g)
        state.progress = state.content = 0
      },
    })
    .to(state, { content: 0, duration: 0.1, ease: 'power2.out' }, 0)
    .to(state, { progress: 0, duration: 0.1 + 0.18 * state.progress, ease: 'power2.inOut' }, 0)
}

onUnmounted(() => morph?.kill())
</script>
