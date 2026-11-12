<template>
  <section class="demo">
    <h3>A row's text, with its icon and shortcut kept</h3>
    <p class="note">
      <code>#label</code> replaces only the text of a row. The icon, the shortcut and a submenu's
      chevron stay where they are, unlike <code>#item</code>, which replaces the whole row.
    </p>
    <Menu :items="items">
      <template #trigger>
        <Button>File</Button>
      </template>
      <template #label="{ item }">
        {{ item.label }}
        <Badge v-if="item.value === 'export'" variant="muted">New</Badge>
      </template>
    </Menu>
  </section>
</template>

<script setup lang="ts">
import { PhDownloadSimple, PhFloppyDisk, PhPrinter } from '@phosphor-icons/vue'
import { Badge, Button, Menu } from 'vael-ui'
import type { MenuEntry } from 'vael-ui'

const items: MenuEntry[] = [
  { label: 'Save', value: 'save', icon: PhFloppyDisk, shortcut: '⌘S' },
  { label: 'Export as PDF', value: 'export', icon: PhDownloadSimple, shortcut: '⌘E' },
  { label: 'Print', value: 'print', icon: PhPrinter, shortcut: '⌘P' },
]
</script>
