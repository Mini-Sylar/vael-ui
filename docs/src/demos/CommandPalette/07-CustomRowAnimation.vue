<template>
  <section class="demo">
    <h3>Your own row animation (GSAP)</h3>
    <p class="note">
      By default, rows change at once while you type and only the list's height eases.
      <code>motion.items</code> with <code>enter</code> and <code>leave</code> hooks hands each row
      to your library: return the tween and the row waits for it. Here new rows rise in with a short
      stagger.
    </p>
    <div class="row">
      <Button @click="open = true">Open command palette</Button>
    </div>
    <CommandPalette v-model:open="open" :items="commands" :motion="rows" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { gsap } from 'gsap'
import { Button, CommandPalette } from 'vael-ui'
import type { CommandPaletteItem, CommandPaletteMotion } from 'vael-ui'

const open = shallowRef(false)

const commands: CommandPaletteItem[] = [
  { id: 'new-file', label: 'New file', group: 'Create' },
  { id: 'new-folder', label: 'New folder', group: 'Create' },
  { id: 'invite', label: 'Invite teammate', group: 'Create' },
  { id: 'export', label: 'Export as PDF', group: 'File' },
  { id: 'archive', label: 'Archive project', group: 'File' },
  { id: 'settings', label: 'Open settings', group: 'App' },
]

const rows: CommandPaletteMotion = {
  items: {
    // `index` counts rows arriving together; capped, so a long list never feels slow.
    enter: ({ item }, { index }) =>
      gsap.fromTo(
        item,
        { opacity: 0, y: 6, filter: 'blur(4px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.22,
          delay: Math.min(index, 6) * 0.025,
          ease: 'power3.out',
          clearProps: 'filter,transform',
        },
      ),
    // Leaving rows go quickly, so stale results never sit under new ones.
    leave: ({ item }) => gsap.to(item, { opacity: 0, duration: 0.08, ease: 'power1.out' }),
  },
}
</script>
