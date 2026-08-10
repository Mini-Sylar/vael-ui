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
import Menu from '../../src/components/Menu/Menu.vue'
import type { MenuEntry } from '../../src/components/Menu/Menu.vue'

const items: MenuEntry[] = [
  { label: 'Cut', value: 'cut' },
  {
    label: 'Share',
    items: [
      { label: 'Copy Link', value: 'copy-link' },
      { label: 'Email', value: 'email' },
      {
        label: 'Social',
        items: [
          {
            label: 'Twitter',
            items: [
              { label: 'Post', value: 'twitter-post' },
              { label: 'DM', value: 'twitter-dm' },
            ],
          },
          { label: 'Mastodon', value: 'mastodon' },
        ],
      },
    ],
  },
  { label: 'Paste', value: 'paste' },
]

const open = shallowRef(false)
const selected = shallowRef('')
</script>
