<template>
  <output data-testid="selected">{{ selected }}</output>
  <MenuList :items="items" @select="selected = $event.value ?? ''">
    <template #item="{ item }">
      <span data-testid="custom-row">★ {{ item.label }}</span>
    </template>
  </MenuList>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import MenuList from '../../src/components/MenuList.vue'
import type { MenuEntry } from '../../src/components/MenuList.vue'

const items: MenuEntry[] = [
  { label: 'Home', value: 'home' },
  { label: 'Profile', value: 'profile' },
]

const selected = shallowRef('')
</script>
