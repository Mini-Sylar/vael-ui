<template>
  <section class="demo">
    <h3>Icons, shortcut hints, and groups</h3>
    <p class="note">
      <code>icon</code>, <code>shortcut</code> and <code>group</code> are optional on each item.
      <code>shortcut</code> only shows a <code>Kbd</code> hint; it doesn’t bind the key. Items that
      share a <code>group</code> appear under a sticky heading, in the order each group first
      appears, even when they aren’t next to each other in the array. The arrow keys follow that
      order, and the <code>#group-label</code> slot adds a count to each heading here.
    </p>
    <div class="row">
      <Button variant="outline" @click="groupedOpen = true">Open grouped palette</Button>
    </div>
    <CommandPalette v-model:open="groupedOpen" :items="groupedCommands">
      <template #group-label="{ group, items }">
        {{ group }} <span class="group-count">{{ items.length }}</span>
      </template>
    </CommandPalette>
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
.group-count {
  margin-inline-start: 0.25rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
