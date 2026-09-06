<template>
  <output data-testid="selected">{{ selected }}</output>
  <Menu :items="items" @select="selected = $event.value ?? ''">
    <template #trigger>
      <button data-testid="trigger">open menu</button>
    </template>
    <!-- Custom row markup that must keep applying at EVERY submenu depth, not
         revert to the default row past level one. The `mark:` prefix is what
         the test looks for. -->
    <template #item="{ item }">
      <span class="mark-row">mark:{{ item.label }}</span>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Menu from '../../src/components/Menu/Menu.vue'
import type { MenuEntry } from '../../src/components/Menu/Menu.vue'

const items: MenuEntry[] = [
  { label: 'Cut', value: 'cut' },
  {
    label: 'Share',
    items: [
      { label: 'Copy Link', value: 'copy-link' },
      {
        label: 'Social',
        items: [
          { label: 'Twitter', value: 'twitter' },
          { label: 'Mastodon', value: 'mastodon' },
        ],
      },
    ],
  },
]

const selected = shallowRef('')
</script>
