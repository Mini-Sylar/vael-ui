<template>
  <button data-testid="open" @click="open = true">Open</button>
  <output data-testid="state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="exit-ran">{{ exitRan }}</output>

  <Dialog
    ref="dlg"
    v-model:open="open"
    force-mount
    :before-close="beforeClose"
    aria-label="Imperative dialog"
  >
    <template #default="{ close }">
      <p>Imperative exit</p>
      <button data-testid="dismiss" @click="close()">Dismiss</button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'

const open = shallowRef(false)
const exitRan = shallowRef(false)
const dlg = useTemplateRef('dlg')

/**
 * The imperative exit fallback: forceMount disables the internal Transition, and beforeClose
 * holds the model open until the WAAPI animation finishes, then allows the close.
 * (Same shape works with GSAP or motion's animate().)
 */
async function beforeClose() {
  const panel = dlg.value?.panelEl
  if (!panel) return true
  const animation = panel.animate(
    [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.96)' },
    ],
    { duration: 400, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  )
  await animation.finished
  exitRan.value = true
  return true
}
</script>
