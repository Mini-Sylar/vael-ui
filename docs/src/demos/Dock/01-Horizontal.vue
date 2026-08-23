<template>
  <section class="demo">
    <h3>Horizontal, default orientation</h3>
    <div class="row">
      <Dock aria-label="Applications" :items="appItems" @select="onSelect" />
    </div>
    <p class="note">
      Last opened: <strong>{{ lastSelected ?? 'none yet' }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dock } from 'vael-ui'
import type { DockItemData } from 'vael-ui'
import {
  PhBrowser,
  PhCalendar,
  PhChatCircleDots,
  PhEnvelopeSimple,
  PhGear,
  PhMusicNotes,
  PhNotePencil,
  PhTerminalWindow,
  PhTrash,
} from '@phosphor-icons/vue'

const lastSelected = shallowRef<string | null>(null)
const unread = shallowRef(3)

function onSelect(item: DockItemData) {
  lastSelected.value = item.label
}

const appItems: DockItemData[] = [
  {
    label: 'Finder',
    value: 'finder',
    icon: PhBrowser,
    onSelect: () => (lastSelected.value = 'Finder'),
  },
  { label: 'Mail', value: 'mail', icon: PhEnvelopeSimple, badge: unread.value },
  { label: 'Messages', value: 'messages', icon: PhChatCircleDots, badge: 2 },
  { label: 'Notes', value: 'notes', icon: PhNotePencil },
  { label: 'Calendar', value: 'calendar', icon: PhCalendar },
  { label: 'Music', value: 'music', icon: PhMusicNotes },
  { label: 'Terminal', value: 'terminal', icon: PhTerminalWindow },
  { label: 'Settings', value: 'settings', icon: PhGear },
  { label: 'Trash', value: 'trash', icon: PhTrash, disabled: true },
]
</script>

<style scoped></style>
