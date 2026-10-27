<!-- Menu open with every part: a panel with a header above its items and a footer below. -->
<template>
  <div data-specimen class="specimen">
    <Menu v-model:open="open" :items="items" align="start" :close-on-outside="false">
      <template #trigger>
        <Button variant="outline">
          Ada Lovelace
          <template #trailing><PhCaretDown /></template>
        </Button>
      </template>
      <template #header>
        <strong class="name">Ada Lovelace</strong>
        <span class="muted">ada@lovelace.dev</span>
      </template>
      <template #footer><span class="muted">Team plan · 4 of 10 seats</span></template>
    </Menu>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuEntry } from 'vael-ui'
import { PhCaretDown, PhCreditCard, PhGear, PhSignOut, PhUser } from '@phosphor-icons/vue'

const items: MenuEntry[] = [
  { label: 'Profile', icon: PhUser },
  { label: 'Billing', icon: PhCreditCard },
  { label: 'Settings', icon: PhGear, shortcut: '⌘,' },
  { type: 'separator' },
  { label: 'Sign out', icon: PhSignOut, danger: true },
]
// Open from the start, and kept open while you point at its parts.
const open = ref(true)
</script>

<style scoped>
.specimen {
  inline-size: min(16rem, 100%);
  min-block-size: 20rem;
}
.name {
  display: block;
  font-size: 0.875rem;
}
.muted {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
