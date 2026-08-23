<template>
  <section class="demo">
    <h3>Custom exit: motion-v spring + staggered rows</h3>
    <p class="note">
      The panel springs in with real overshoot (<code>bounce: 0.35</code>), then each row cascades
      in individually with a 40ms stagger — a class of choreography a single CSS
      <code>transition</code> on the panel alone can't express.
    </p>
    <div class="row">
      <Button variant="secondary" @click="motionEnter">Open (motion-v)</Button>
    </div>
    <CommandPalette
      ref="motionPalette"
      v-model:open="motionOpen"
      force-mount
      :before-close="motionBeforeClose"
      :items="commands"
      @select="(item) => (lastSelected = item.label)"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useAnimate } from 'motion-v'
import { Button, CommandPalette } from 'vael-ui'
import type { CommandPaletteItem } from 'vael-ui'
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
const motionOpen = shallowRef(false)
const motionPalette = useTemplateRef('motionPalette')
const [, animateMotion] = useAnimate()

function motionEnter() {
  motionOpen.value = true
  requestAnimationFrame(() => {
    const panel = motionPalette.value?.panelEl
    if (!panel) return
    animateMotion(
      panel,
      { opacity: [0, 1], scale: [0.9, 1], y: [24, 0] },
      { type: 'spring', bounce: 0.35, duration: 0.5 },
    )
    panel.querySelectorAll<HTMLElement>('.ui-command-palette-item').forEach((item, i) => {
      animateMotion(
        item,
        { opacity: [0, 1], y: [8, 0] },
        { duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] },
      )
    })
  })
}
async function motionBeforeClose(done: () => void) {
  const panel = motionPalette.value?.panelEl
  if (!panel) return done()
  const controls = animateMotion(
    panel,
    { opacity: 0, scale: 0.92, y: 12 },
    { duration: 0.15, ease: [0.4, 0, 1, 1] },
  )
  await controls.finished
  done()
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
