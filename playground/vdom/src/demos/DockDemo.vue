<template>
  <section class="demo">
    <h2>Dock</h2>
    <p class="note">
      A macOS-style dock — icons magnify by real-time pointer PROXIMITY, not just the hovered item:
      move across the row and watch neighbors rise and fall in a smooth falloff. Gated to
      <code>(hover: hover) and (pointer: fine)</code> — try Tab + Enter/Space below with the mouse
      parked elsewhere; the dock stays fully usable, just un-magnified.
    </p>

    <h3>Horizontal — default orientation</h3>
    <div class="row">
      <Dock aria-label="Applications" :items="appItems" @select="onSelect" />
    </div>
    <p class="note">
      Last opened: <strong>{{ lastSelected ?? 'none yet' }}</strong>
    </p>

    <h3>Vertical — <code>orientation="vertical"</code></h3>
    <p class="note">Same falloff math, just measured along the block axis instead.</p>
    <div class="row">
      <Dock aria-label="Side dock" orientation="vertical" :items="appItems" @select="onSelect" />
    </div>

    <h3>Configurable size and falloff range</h3>
    <p class="note">
      Larger <code>max-size</code>, tighter <code>range</code> — magnification concentrates on fewer
      neighbors instead of spreading gently across the whole row.
    </p>
    <div class="row">
      <Dock
        aria-label="Compact dock"
        :items="appItems.slice(0, 6)"
        :base-size="40"
        :max-size="88"
        :range="90"
        @select="onSelect"
      />
    </div>

    <h3>Magnification off — <code>:magnify="false"</code></h3>
    <p class="note">
      Stays fully interactive (click, keyboard, tooltips) — items just never grow. Distinct from
      <code>disabled</code>, which also blocks interaction outright.
    </p>
    <div class="row">
      <Dock aria-label="Plain dock" :items="appItems" :magnify="false" @select="onSelect" />
    </div>
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
