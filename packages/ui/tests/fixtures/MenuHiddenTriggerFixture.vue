<template>
  <div :style="{ display: shown ? 'block' : 'none', paddingBlockStart: '200px' }">
    <Menu v-model:open="open" :items="items">
      <template #trigger>
        <Button data-testid="trigger">open menu</Button>
      </template>
    </Menu>
  </div>
  <button data-testid="show" @click="shown = true">show</button>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Menu from '../../src/components/Menu/Menu.vue'
import Button from '../../src/components/Button/Button.vue'
import type { MenuEntry } from '../../src/components/Menu/Menu.vue'

const shown = shallowRef(false)
const open = shallowRef(false)
const items: MenuEntry[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
]
</script>
