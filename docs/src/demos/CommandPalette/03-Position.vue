<template>
  <section class="demo">
    <h3><code>position</code></h3>
    <p class="note">
      Forwarded straight to the underlying <code>Dialog</code>. Default <code>top</code> matches the
      Spotlight/Raycast convention; <code>center</code> reads more like a regular modal.
    </p>
    <div class="row">
      <Button variant="outline" @click="centerOpen = true">Open, position="center"</Button>
    </div>
    <CommandPalette v-model:open="centerOpen" position="center" :items="commands" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
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

const centerOpen = shallowRef(false)
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
