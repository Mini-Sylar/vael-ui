<template>
  <MenuList :items="topItems" @select="onTopSelect" />
  <Collapsible v-model:open="open">
    <template #trigger>
      <button type="button">Settings</button>
    </template>
    <output data-testid="selected">{{ selected }}</output>
    <MenuList :items="subItems" :active="active" @select="onSubSelect" />
  </Collapsible>
</template>

<!--
  Mirrors DashboardSidebar.vue's real structure: a top-level MenuList sitting
  alongside a Collapsible whose always-in-DOM panel holds a second,
  independent MenuList — the exact shape the dashboard's "keyboard nav
  doesn't work in sub-menus" bug report described. `initialOpen` defaults to
  true so the sub-list's `initRoving()` runs against a panel that's already
  open at mount, same as the sidebar's Settings group.
-->
<script setup lang="ts">
import { shallowRef } from 'vue'
import { Collapsible, MenuList } from '../../src'
import type { MenuEntry } from '../../src'

const props = withDefaults(defineProps<{ initialOpen?: boolean }>(), { initialOpen: true })

const open = shallowRef(props.initialOpen)

const topItems: MenuEntry[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'Orders', value: 'orders' },
]
const subItems: MenuEntry[] = [
  { label: 'General', value: 'general' },
  { label: 'Notifications', value: 'notifications' },
  { label: 'Security', value: 'security' },
]

const active = shallowRef<string | null>(null)
const selected = shallowRef('')
function onTopSelect() {}
function onSubSelect(item: { value?: string }) {
  active.value = item.value ?? null
  selected.value = item.value ?? ''
}

defineExpose({ open })
</script>
