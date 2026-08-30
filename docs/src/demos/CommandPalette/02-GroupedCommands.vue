<template>
  <section class="demo">
    <h3>Icons, shortcut hints, and groups</h3>
    <p class="note">
      <code>icon</code>, <code>shortcut</code>, and <code>group</code> are all optional per item.
      <code>shortcut</code> is display-only — a <code>Kbd</code> hint, not a functioning key binding
      — items sharing a <code>group</code> cluster under a sticky heading in first-seen order, even
      when they aren't adjacent in the array.
    </p>
    <div class="row">
      <Button variant="outline" @click="groupedOpen = true">Open grouped palette</Button>
    </div>
    <CommandPalette v-model:open="groupedOpen" :items="groupedCommands" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, CommandPalette } from 'vael-ui'
import type { CommandPaletteItem } from 'vael-ui'
import { PhFileArrowDown, PhFilePlus, PhFolderPlus, PhGear, PhUserPlus } from '@phosphor-icons/vue'

const modKeyLabel =
  typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'

const groupedCommands: CommandPaletteItem[] = [
  {
    id: 'g-new-file',
    label: 'New File',
    icon: PhFilePlus,
    shortcut: [modKeyLabel, 'N'],
    group: 'File',
  },
  {
    id: 'g-new-folder',
    label: 'New Folder',
    icon: PhFolderPlus,
    shortcut: [modKeyLabel, 'Shift', 'N'],
    group: 'File',
  },
  {
    id: 'g-export',
    label: 'Export as PDF',
    icon: PhFileArrowDown,
    shortcut: [modKeyLabel, 'E'],
    group: 'File',
  },
  {
    id: 'g-invite',
    label: 'Invite Teammate',
    icon: PhUserPlus,
    shortcut: [modKeyLabel, 'I'],
    group: 'Workspace',
  },
  {
    id: 'g-settings',
    label: 'Open Settings',
    icon: PhGear,
    shortcut: [modKeyLabel, ','],
    group: 'Workspace',
  },
]

const groupedOpen = shallowRef(false)
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
