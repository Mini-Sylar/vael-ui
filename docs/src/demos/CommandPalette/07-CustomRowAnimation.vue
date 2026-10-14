<template>
  <section class="demo">
    <h3>Your own row animation (GSAP)</h3>
    <p class="note">
      By default, rows change at once while you type and only the list's height eases.
      <code>:motion-css="false"</code> hands each appearing and disappearing row to
      <code>@item-enter</code> and <code>@item-leave</code> with a <code>done()</code> callback.
      Here new rows rise in with a short stagger.
    </p>
    <div class="row">
      <Button @click="open = true">Open command palette</Button>
    </div>
    <CommandPalette
      v-model:open="open"
      :items="commands"
      :motion-css="false"
      @item-enter="onEnter"
      @item-leave="onLeave"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { gsap } from 'gsap'
import { Button, CommandPalette } from 'vael-ui'
import type { CommandPaletteItem } from 'vael-ui'

const open = shallowRef(false)

const commands: CommandPaletteItem[] = [
  { id: 'new-file', label: 'New file', group: 'Create' },
  { id: 'new-folder', label: 'New folder', group: 'Create' },
  { id: 'invite', label: 'Invite teammate', group: 'Create' },
  { id: 'export', label: 'Export as PDF', group: 'File' },
  { id: 'archive', label: 'Archive project', group: 'File' },
  { id: 'settings', label: 'Open settings', group: 'App' },
]

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onEnter(el: Element, done: () => void) {
  if (reduce()) return done()
  // Capped, so a long list never feels slow.
  const index = Array.prototype.indexOf.call(el.parentElement?.children ?? [], el)
  gsap.fromTo(
    el,
    { opacity: 0, y: 6, filter: 'blur(4px)' },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.22,
      delay: Math.min(index, 6) * 0.025,
      ease: 'power3.out',
      clearProps: 'filter,transform',
      onComplete: done,
    },
  )
}

// Leaving rows go quickly, so stale results never sit under new ones.
function onLeave(el: Element, done: () => void) {
  if (reduce()) return done()
  gsap.to(el, { opacity: 0, duration: 0.08, ease: 'power1.out', onComplete: done })
}
</script>
