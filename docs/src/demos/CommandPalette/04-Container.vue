<template>
  <section class="demo">
    <h3><code>container</code></h3>
    <p class="note">
      Forwarded straight to the underlying <code>Dialog</code> too. Scopes the palette to one pane
      instead of the whole viewport, the rest of the page stays interactive while it's open.
    </p>
    <div ref="paletteContainer" class="palette-container">
      <p class="note" style="margin: 0">A pane with its own content.</p>
      <Button size="sm" variant="outline" @click="containedOpen = true">Open, contained</Button>
    </div>
    <CommandPalette
      v-model:open="containedOpen"
      :container="paletteContainer"
      size="sm"
      :items="commands"
      position="center"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
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

const containedOpen = shallowRef(false)
const paletteContainer = useTemplateRef('paletteContainer')
</script>

<style scoped>
.palette-container {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  block-size: 20rem;
  max-inline-size: 28rem;
  margin-block-end: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
</style>
