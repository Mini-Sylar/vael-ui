<template>
  <section class="demo">
    <h3>Custom exit: GSAP shared-element FLIP</h3>
    <p class="note">
      Grows out of the button's real <code>getBoundingClientRect()</code> position and size (iOS
      app-icon style) instead of scaling from the viewport, the same FLIP technique
      <code>Dialog</code>'s own demo uses. The <code>motion</code> prop's <code>enter</code> and
      <code>leave</code> hooks run it on the panel, and the palette waits for the returned tween.
    </p>
    <div class="row">
      <Button ref="gsapTrigger" variant="secondary" @click="gsapOpen = true"
        >Grow from here (GSAP)</Button
      >
    </div>
    <CommandPalette
      v-model:open="gsapOpen"
      :motion="flipLook"
      :items="commands"
      @select="(item) => (lastSelected = item.label)"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Button, CommandPalette } from 'vael-ui'
import type { CommandPaletteItem, CommandPaletteMotion } from 'vael-ui'
import {
  PhArchive,
  PhFileArrowDown,
  PhFilePlus,
  PhFolderPlus,
  PhGear,
  PhUserPlus,
} from '@phosphor-icons/vue'

const commands: CommandPaletteItem[] = [
  {
    id: 'new-file',
    label: 'New File',
    description: 'Create a blank document',
    keywords: ['create'],
    icon: PhFilePlus,
  },
  { id: 'new-folder', label: 'New Folder', description: 'Group related files', icon: PhFolderPlus },
  {
    id: 'open-settings',
    label: 'Open Settings',
    description: 'Preferences and theme',
    icon: PhGear,
  },
  { id: 'invite', label: 'Invite Teammate', description: 'Share this workspace', icon: PhUserPlus },
  {
    id: 'export',
    label: 'Export as PDF',
    description: 'Download the current document',
    icon: PhFileArrowDown,
  },
  {
    id: 'archived',
    label: 'Archived Item',
    description: 'Not selectable',
    disabled: true,
    icon: PhArchive,
  },
]

const lastSelected = shallowRef<string | null>(null)
const gsapOpen = shallowRef(false)
const gsapTrigger = useTemplateRef('gsapTrigger')

function flipDelta(panel: HTMLElement) {
  const triggerEl = (gsapTrigger.value as { el?: HTMLElement } | null)?.el
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

const flipLook: CommandPaletteMotion = {
  enter: ({ panel }) => {
    const delta = flipDelta(panel)
    if (!delta) return
    return gsap.fromTo(
      panel,
      { ...delta, opacity: 0.4 },
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
    const delta = flipDelta(panel)
    if (!delta) return
    return gsap.to(panel, { ...delta, opacity: 0.4, duration: 0.3, ease: 'power3.out' })
  },
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
