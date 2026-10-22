<template>
  <section class="demo">
    <h3>Custom exit animations: GSAP and motion-v</h3>
    <p class="note">
      Dialog's panel Teleports to <code>&lt;body&gt;</code>, so it can't be wrapped in
      <code>AnimatePresence</code> for exit animation the way an un-Teleported component can.
      Instead, the <code>motion</code> prop takes <code>enter</code> and <code>leave</code> hooks
      that receive the panel: return your tween and the dialog stays mounted until it finishes.
      "Grow from here" is the extreme end: it reads the trigger button's real
      <code>getBoundingClientRect()</code> on open and morphs the panel out of that exact position
      and size, then shrinks back into it on close.
    </p>
    <div class="row">
      <Button @click="gsapOpen = true">Fade (GSAP)</Button>
      <Button ref="flipTrigger" variant="secondary" class="flip-trigger" @click="flipOpen = true"
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
      <code>openDialog()</code> instead of a template <code>&lt;Dialog&gt;</code>: the same
      <code>motion</code> hooks go in its options. Nothing about a dynamic dialog is
      animation-limited compared to a static one.
    </p>

    <Dialog
      v-model:open="gsapOpen"
      :motion="gsapLook"
      aria-label="GSAP dialog"
      title="GSAP enter and exit"
      description="The leave hook returns a GSAP tween, and the dialog waits for it before it unmounts."
    >
      <template #footer="{ close }">
        <Button @click="close()">Close with GSAP</Button>
      </template>
    </Dialog>

    <Dialog
      v-model:open="flipOpen"
      :motion="flipLook"
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
import { shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { animate } from 'motion-v'
import { Button, Dialog, openDialog } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'
import ConfirmDialogContent from './ConfirmDialogContent.vue'
import type { ConfirmDialogData } from './ConfirmDialogContent.vue'

const gsapOpen = shallowRef(false)

const gsapLook: DialogMotion = {
  enter: ({ panel }) =>
    gsap.fromTo(
      panel,
      { opacity: 0, scale: 0.96, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power3.out' },
    ),
  leave: ({ panel }) =>
    gsap.to(panel, { opacity: 0, scale: 0.96, duration: 0.15, ease: 'power3.out' }),
}

const flipOpen = shallowRef(false)
const flipTrigger = useTemplateRef('flipTrigger')
const elOf = (button: unknown) => (button as { el?: HTMLElement } | null)?.el ?? null

function flipDelta(triggerEl: HTMLElement | null, panel: HTMLElement) {
  if (!triggerEl) return null
  const t = triggerEl.getBoundingClientRect()
  const p = panel.getBoundingClientRect()
  return {
    x: t.left + t.width / 2 - (p.left + p.width / 2),
    y: t.top + t.height / 2 - (p.top + p.height / 2),
    scaleX: t.width / p.width,
    scaleY: t.height / p.height,
  }
}

const flipLook: DialogMotion = {
  enter: ({ panel }) => {
    const delta = flipDelta(elOf(flipTrigger.value), panel)
    if (!delta) return
    return gsap.fromTo(
      panel,
      { ...delta, opacity: 0.5 },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: 0.45,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      },
    )
  },
  leave: ({ panel }) => {
    const delta = flipDelta(elOf(flipTrigger.value), panel)
    if (!delta) return
    return gsap.to(panel, { ...delta, opacity: 0.4, duration: 0.3, ease: 'power3.out' })
  },
}

const dynamicFlipMotionTrigger = useTemplateRef('dynamicFlipMotionTrigger')
const flipEase: [number, number, number, number] = [0.17, 0.84, 0.44, 1]

function openDynamicFlipMotion() {
  const triggerEl = elOf(dynamicFlipMotionTrigger.value)
  openDialog<ConfirmDialogData, boolean>(ConfirmDialogContent, {
    data: {
      message: 'Grew out of the button that opened it, same FLIP math as "Grow from here" above.',
    },
    title: 'Dynamic FLIP (motion-v)',
    size: 'sm',
    motion: {
      enter: ({ panel }) => {
        const delta = flipDelta(triggerEl, panel)
        if (!delta) return
        return animate(
          panel,
          {
            x: [delta.x, 0],
            y: [delta.y, 0],
            scaleX: [delta.scaleX, 1],
            scaleY: [delta.scaleY, 1],
            opacity: [0.5, 1],
          },
          { duration: 0.45, ease: flipEase },
        )
      },
      leave: ({ panel }) => {
        const delta = flipDelta(triggerEl, panel)
        if (!delta) return
        return animate(panel, { ...delta, opacity: 0.4 }, { duration: 0.3, ease: flipEase })
      },
    },
  })
}
</script>

<style scoped>
.flip-trigger {
  min-inline-size: 9rem;
  block-size: 3.75rem;
}
</style>
