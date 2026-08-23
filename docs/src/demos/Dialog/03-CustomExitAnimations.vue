<template>
  <section class="demo">
    <h3>Custom exit animations: GSAP and motion-v</h3>
    <p class="note">
      Dialog's panel Teleports to <code>&lt;body&gt;</code>, so it can't be wrapped in
      <code>AnimatePresence</code> for exit animation the way an un-Teleported component can. The
      escape hatch is the same three hooks every animated component in this library exposes:
      <code>force-mount</code> (keep the panel mounted, own it via <code>v-show</code>),
      <code>before-close(done)</code> (run your own exit, then call <code>done()</code> to actually
      unmount), and the exposed <code>panelEl</code> ref to animate. "Grow from here" is the extreme
      end: it reads the trigger button's real <code>getBoundingClientRect()</code> on open and
      morphs the panel out of that exact position and size, then shrinks back into it on close.
    </p>
    <div class="row">
      <Button @click="gsapEnter">Force-mount fade (GSAP)</Button>
      <Button ref="flipTrigger" variant="secondary" class="flip-trigger" @click="flipEnter"
        >Grow from here (GSAP)</Button
      >
      <Button
        ref="dynamicFlipMotionTrigger"
        variant="secondary"
        class="flip-trigger"
        @click="openDynamicFlipMotion"
        >Dynamic FLIP (motion-v)</Button
      >
    </div>
    <p class="note">
      "Dynamic FLIP" runs the identical shared-element math as "Grow from here," but through
      <code>openDialog()</code> instead of a template <code>&lt;Dialog ref&gt;</code>: the returned
      handle's <code>panelEl</code> stands in for the template ref, and
      <code>beforeClose</code> works exactly the same way. Nothing about a dynamic dialog is
      animation-limited compared to a static one.
    </p>

    <Dialog
      ref="gsapDialog"
      v-model:open="gsapOpen"
      force-mount
      :before-close="gsapBeforeClose"
      aria-label="GSAP dialog"
      title="Imperative exit"
      description="force-mount + beforeClose(done): GSAP animates the exposed panelEl, then done() flips the model."
    >
      <template #footer="{ close }">
        <Button @click="close()">Close with GSAP</Button>
      </template>
    </Dialog>

    <Dialog
      ref="flipDialog"
      v-model:open="flipOpen"
      force-mount
      :before-close="flipBeforeClose"
      aria-label="FLIP dialog"
      title="Shared-element FLIP (GSAP)"
      size="sm"
    >
      <template #default>
        <p>
          Watch the edges: this grew out of the button's own rect, not the viewport center. Closing
          shrinks it back into the same button.
        </p>
      </template>
      <template #footer="{ close }">
        <Button @click="close()">Shrink back</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { useAnimate } from 'motion-v'
import { Button, Dialog, openDialog } from 'vael-ui'
import type { OpenDialogHandle } from 'vael-ui'
import ConfirmDialogContent from './ConfirmDialogContent.vue'
import type { ConfirmDialogData } from './ConfirmDialogContent.vue'

const gsapOpen = shallowRef(false)
const gsapDialog = useTemplateRef('gsapDialog')

function gsapEnter() {
  gsapOpen.value = true
  requestAnimationFrame(() => {
    const panel = gsapDialog.value?.panelEl
    if (!panel) return
    gsap.fromTo(
      panel,
      { opacity: 0, scale: 0.96, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power3.out' },
    )
  })
}

function gsapBeforeClose(done: () => void) {
  const panel = gsapDialog.value?.panelEl
  if (!panel) return done()
  gsap.to(panel, { opacity: 0, scale: 0.96, duration: 0.15, ease: 'power3.out', onComplete: done })
}

const flipOpen = shallowRef(false)
const flipDialog = useTemplateRef('flipDialog')
const flipTrigger = useTemplateRef('flipTrigger')

function flipDelta(triggerEl: HTMLElement | null, panel: HTMLElement | null) {
  if (!triggerEl || !panel) return null
  const t = triggerEl.getBoundingClientRect()
  const p = panel.getBoundingClientRect()
  return {
    panel,
    x: t.left + t.width / 2 - (p.left + p.width / 2),
    y: t.top + t.height / 2 - (p.top + p.height / 2),
    scaleX: t.width / p.width,
    scaleY: t.height / p.height,
  }
}

function flipEnter() {
  flipOpen.value = true
  requestAnimationFrame(() => {
    const triggerEl = (flipTrigger.value as { el?: HTMLElement } | null)?.el ?? null
    const delta = flipDelta(triggerEl, flipDialog.value?.panelEl ?? null)
    if (!delta) return
    gsap.fromTo(
      delta.panel,
      { x: delta.x, y: delta.y, scaleX: delta.scaleX, scaleY: delta.scaleY, opacity: 0.5 },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: 0.45,
        ease: 'power3.out',
        onComplete: () => gsap.set(delta.panel, { clearProps: 'transform,opacity' }),
      },
    )
  })
}

function flipBeforeClose(done: () => void) {
  const triggerEl = (flipTrigger.value as { el?: HTMLElement } | null)?.el ?? null
  const delta = flipDelta(triggerEl, flipDialog.value?.panelEl ?? null)
  if (!delta) return done()
  gsap.to(delta.panel, {
    x: delta.x,
    y: delta.y,
    scaleX: delta.scaleX,
    scaleY: delta.scaleY,
    opacity: 0.4,
    duration: 0.3,
    ease: 'power3.in',
    onComplete: () => {
      done()
      requestAnimationFrame(() => {
        gsap.set(delta.panel, { clearProps: 'transform,opacity' })
      })
    },
  })
}

const [, animateMotion] = useAnimate()

function clearPanelOverrides(panel: HTMLElement) {
  panel.style.transform = ''
  panel.style.opacity = ''
}

const dynamicFlipMotionTrigger = useTemplateRef('dynamicFlipMotionTrigger')
function openDynamicFlipMotion() {
  const triggerEl = (dynamicFlipMotionTrigger.value as { el?: HTMLElement } | null)?.el ?? null
  const { panelEl } = openDialog<ConfirmDialogData, boolean>(ConfirmDialogContent, {
    data: {
      message: 'Grew out of the button that opened it, same FLIP math as "Grow from here" above.',
    },
    title: 'Dynamic FLIP (motion-v)',
    size: 'sm',
    forceMount: true,
    async beforeClose(done) {
      const delta = flipDelta(triggerEl, panelEl.value)
      if (!delta) return done()
      const controls = animateMotion(
        delta.panel,
        { x: delta.x, y: delta.y, scaleX: delta.scaleX, scaleY: delta.scaleY, opacity: 0.4 },
        { duration: 0.3, ease: [0.36, 0, 0.66, -0.03] },
      )
      await controls.finished
      done()
      requestAnimationFrame(() => clearPanelOverrides(delta.panel))
    },
  })
  watch(
    panelEl,
    async (panel) => {
      const delta = flipDelta(triggerEl, panel)
      if (!delta) return
      await animateMotion(
        delta.panel,
        { x: delta.x, y: delta.y, scaleX: delta.scaleX, scaleY: delta.scaleY, opacity: 0.5 },
        { duration: 0 },
      ).finished
      const controls = animateMotion(
        delta.panel,
        { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
        { duration: 0.45, ease: [0.17, 0.84, 0.44, 1] },
      )
      await controls.finished
      clearPanelOverrides(delta.panel)
    },
    { once: true },
  )
}
</script>

<style scoped>
.flip-trigger {
  min-inline-size: 9rem;
  block-size: 3.75rem;
}
</style>
