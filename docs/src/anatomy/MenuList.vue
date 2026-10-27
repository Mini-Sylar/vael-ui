<!-- MenuList with every part: a workspace nav with the current page marked and two separators. -->
<template>
  <div data-specimen class="specimen">
    <MenuList :items="items" active="overview" aria-label="Workspace" />
  </div>
</template>

<script setup lang="ts">
import { MenuList } from 'vael-ui'
import type { MenuEntry } from 'vael-ui'
import { PhChartBar, PhCreditCard, PhGear, PhHouse, PhSignOut, PhUsers } from '@phosphor-icons/vue'

const items: MenuEntry[] = [
  { label: 'Overview', value: 'overview', icon: PhHouse, shortcut: '⌘1' },
  { label: 'Reports', value: 'reports', icon: PhChartBar, shortcut: '⌘2' },
  { label: 'Members', value: 'members', icon: PhUsers },
  { type: 'separator' },
  { label: 'Billing', value: 'billing', icon: PhCreditCard },
  { label: 'Settings', value: 'settings', icon: PhGear },
  { type: 'separator' },
  { label: 'Sign out', value: 'sign-out', icon: PhSignOut },
]
</script>

<style scoped>
.specimen {
  inline-size: min(16rem, 100%);
}
</style>
