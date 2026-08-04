<template>
  <output data-testid="selected">{{ selected }}</output>
  <MenuList :items="items" :active="active" @select="onSelect" />
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import MenuList from '../../src/components/MenuList/MenuList.vue'
import type { MenuEntry } from '../../src/components/MenuList/MenuList.vue'

const items: MenuEntry[] = [
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'Reports', value: 'reports' },
  { label: 'Settings', value: 'settings', disabled: true },
  { type: 'separator' },
  {
    label: 'Team',
    items: [
      { label: 'Members', value: 'members' },
      { label: 'Roles', value: 'roles' },
    ],
  },
  { label: 'Billing', value: 'billing' },
]

const active = shallowRef<string | null>('reports')
const selected = shallowRef('')
function onSelect(item: { value?: string }) {
  selected.value = item.value ?? ''
}
</script>
