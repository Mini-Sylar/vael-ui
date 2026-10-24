<template>
  <section class="demo">
    <h2>Drawer / Sidebar</h2>
    <p class="note">
      Not a new component — <code>&lt;Dialog&gt;</code> at <code>position="left"</code> or
      <code>"right"</code>, full-height and flush to the edge instead of centered. Everything Dialog
      already does (Escape, overlay click, <code>beforeClose</code>, the <code>motion</code> prop)
      works unchanged — see "Family drawer" below for that same contract at
      <code>position="bottom"</code>.
    </p>

    <h3>Left / right edge</h3>
    <div class="row">
      <Button @click="leftOpen = true">Open left</Button>
      <Button @click="rightOpen = true">Open right</Button>
    </div>
    <Dialog v-model:open="leftOpen" position="left" title="Left drawer">
      <p class="panel-text">Slides in from the left edge, full viewport height.</p>
    </Dialog>
    <Dialog v-model:open="rightOpen" position="right" title="Right drawer">
      <p class="panel-text">Slides in from the right edge, full viewport height.</p>
    </Dialog>

    <h3>Pinned sidebar — <code>:modal="false"</code></h3>
    <p class="note">
      No overlay, no scroll lock, no stolen focus — the page behind stays fully interactive (click
      the counter while the drawer is open). Escape still closes it. It's still a Teleported,
      fixed-position panel though, not real in-flow layout — a sidebar that actually reflows page
      content is app layout code, not something a floating primitive can give you. The push effect
      below is plain consumer CSS reacting to the open state, entirely outside Dialog.
    </p>
    <div class="drawer-pinned-demo" :class="{ 'drawer-pinned-demo--pushed': pinnedOpen }">
      <div class="drawer-pinned-page">
        <Button @click="pinnedOpen = !pinnedOpen"
          >{{ pinnedOpen ? 'Close' : 'Open' }} sidebar</Button
        >
        <Button variant="outline" @click="counter++">Clicked {{ counter }} times</Button>
      </div>
    </div>
    <Dialog v-model:open="pinnedOpen" position="left" :modal="false" title="Pinned sidebar">
      <p class="panel-text">Non-modal — try clicking the counter button behind this panel.</p>
    </Dialog>

    <h3>Motion-v: full external control</h3>
    <p class="note">
      <code>motion</code>'s <code>enter</code>/<code>leave</code> hooks hand a motion-v spring the
      whole enter/exit — the built-in look never runs. Same shape as the family drawer's slide,
      rotated onto <code>translateX</code>.
    </p>
    <Button @click="motionOpen = true">Open spring drawer</Button>
    <Dialog v-model:open="motionOpen" :motion="springLook" position="right" title="Spring drawer">
      <p class="panel-text">Driven entirely by <code>motion-v</code>'s <code>animate()</code>.</p>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { animate } from 'motion-v'
import { Button, Dialog } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const leftOpen = shallowRef(false)
const rightOpen = shallowRef(false)
const pinnedOpen = shallowRef(false)
const counter = shallowRef(0)

const motionOpen = shallowRef(false)

let progress = 0
let slideDistance = 0
let spring: ReturnType<typeof animate> | undefined
let resizeHandler: (() => void) | undefined

function renderPanel(panel: HTMLElement) {
  panel.style.transform = `translateX(${(1 - progress) * slideDistance}px)`
  panel.style.opacity = `${progress}`
}

function animateTo(panel: HTMLElement, target: number) {
  spring?.stop()
  renderPanel(panel)
  spring = animate(progress, target, {
    type: 'spring',
    visualDuration: 0.35,
    bounce: 0.25,
    onUpdate: (v: number) => {
      progress = v
      renderPanel(panel)
    },
  })
  return spring
}

const springLook: DialogMotion = {
  enter({ panel }) {
    // Measured before the first transform, with the panel at rest
    slideDistance = window.innerWidth - panel.getBoundingClientRect().left
    if (!resizeHandler) {
      resizeHandler = () => {
        slideDistance = window.innerWidth - panel.getBoundingClientRect().left
      }
      window.addEventListener('resize', resizeHandler)
    }
    return animateTo(panel, 1)
  },
  leave({ panel }) {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = undefined
    }
    return animateTo(panel, 0)
  },
}
</script>

<style scoped>
.drawer-pinned-demo {
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}

.drawer-pinned-page {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  transition: margin-inline-start 220ms var(--ui-ease-out);
}

/* Matches pinned drawer's default width to avoid drift */
.drawer-pinned-demo--pushed .drawer-pinned-page {
  margin-inline-start: min(20rem, 90vw);
}

@media (prefers-reduced-motion: reduce) {
  .drawer-pinned-page {
    transition: none;
  }
}
</style>
