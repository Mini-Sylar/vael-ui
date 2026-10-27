<template>
  <section class="demo">
    <h3>A motion-v spring with staggered rows</h3>
    <p class="note">
      The panel springs in with overshoot (<code>bounce: 0.35</code>), and each row rises in 40 ms
      after the one before. Both run in the <code>motion</code> prop’s <code>enter</code> hook, and
      <code>leave</code> returns the exit for the palette to wait for.
    </p>
    <div class="row">
      <Button variant="secondary" @click="motionOpen = true">Open (motion-v)</Button>
    </div>
    <CommandPalette
      v-model:open="motionOpen"
      :motion="springLook"
      :items="commands"
      @select="(item) => (lastSelected = item.label)"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { animate } from 'motion-v'
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
const motionOpen = shallowRef(false)

const springLook: CommandPaletteMotion = {
  enter: ({ panel }) => {
    panel.querySelectorAll<HTMLElement>('.ui-command-palette-item').forEach((item, i) => {
      animate(
        item,
        { opacity: [0, 1], y: [8, 0] },
        { duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] },
      )
    })
    return animate(
      panel,
      { opacity: [0, 1], scale: [0.9, 1], y: [24, 0] },
      { type: 'spring', bounce: 0.35, duration: 0.5 },
    )
  },
  leave: ({ panel }) =>
    animate(
      panel,
      { opacity: 0, scale: 0.92, y: 12 },
      { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
    ),
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
