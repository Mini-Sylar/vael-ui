<template>
  <output data-testid="selected">{{ selected }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <Menu v-model:open="open" :items="items" @select="selected = $event.value ?? ''">
    <template #trigger>
      <button data-testid="trigger">open menu</button>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Menu from '../../src/components/Menu.vue'
import type { MenuEntry } from '../../src/components/Menu.vue'

const items: MenuEntry[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry', disabled: true },
  { type: 'separator' },
  { label: 'Date', value: 'date', keepOpen: true },
]

const open = shallowRef(false)
const selected = shallowRef('')
</script>
