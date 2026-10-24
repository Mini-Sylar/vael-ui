<template>
  <section class="demo">
    <h3>The whole page recedes</h3>
    <p class="note">
      One <code>linked</code> entry moves your app’s root with the drawer: the page shrinks and
      rounds while the drawer is open, on the drawer’s own curve, and comes back as it closes. A
      second entry darkens the space around it. The same object works on a BottomSheet or a Dialog.
    </p>
    <Button @click="show">Open the drawer</Button>
    <Drawer v-model:open="open" side="right" title="Filters" :motion="recede" @after-leave="reset">
      <p class="note">The page behind you is the whole docs site.</p>
      <Button variant="outline" @click="open = false">Done</Button>
    </Drawer>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { Button, Drawer } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const open = shallowRef(false)
const app = () => document.getElementById('app')

// One entry per element that moves with the drawer: the page behind it, and the space around it.
const recede = shallowRef<DialogMotion>()
function show() {
  const root = app()
  if (!root) return
  // Only what's on screen: scaled down, the rest of the page would come into view around it. It
  // shrinks toward the middle of that, wherever the page is scrolled.
  const top = scrollY
  const bottom = root.scrollHeight - scrollY - innerHeight
  root.style.clipPath = `inset(${top}px 0 ${bottom}px 0)`
  root.style.transformOrigin = `50% ${scrollY + innerHeight / 2}px`
  recede.value = {
    linked: {
      page: {
        el: app,
        open: { scale: 0.94, clipPath: `inset(${top}px 0 ${bottom}px 0 round 16px)` },
      },
      backdrop: { el: () => document.body, open: { backgroundColor: 'black' } },
    },
  }
  open.value = true
}
// Closed: the page scrolls freely again.
function reset() {
  app()?.style.removeProperty('clip-path')
  app()?.style.removeProperty('transform-origin')
}
// The root needs its own background, so only the space around it darkens.
onMounted(() => app()?.style.setProperty('background', 'var(--ui-surface)'))
onBeforeUnmount(() => {
  reset()
  app()?.style.removeProperty('background')
})
</script>
