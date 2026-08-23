<template>
  <section class="demo">
    <h3>Default (CSS transition, shortcut, icons)</h3>
    <p class="note">
      Press <Kbd>{{ modKeyLabel }}</Kbd
      >+<Kbd>K</Kbd> anywhere on this page, or click the button. <code>shortcut</code> is opt-in —
      nothing listens until you set it.
    </p>
    <div class="row">
      <Button @click="basicOpen = true">Open command palette</Button>
      <span v-if="lastSelected" class="note"
        >Last selected: <code>{{ lastSelected }}</code></span
      >
    </div>
    <CommandPalette
      v-model:open="basicOpen"
      shortcut="mod+k"
      :items="commands"
      @select="(item) => (lastSelected = item.label)"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, CommandPalette, Kbd } from 'vael-ui'
import type { CommandPaletteItem } from 'vael-ui'
import {
  PhArchive,
  PhFileArrowDown,
  PhFilePlus,
  PhFolderPlus,
  PhGear,
  PhUserPlus,
} from '@phosphor-icons/vue'

const modKeyLabel =
  typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'

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
const basicOpen = shallowRef(false)
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
