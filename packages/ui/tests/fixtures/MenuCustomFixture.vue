<template>
  <output data-testid="selected">{{ selected }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <Menu v-model:open="open">
    <template #trigger>
      <button data-testid="trigger">open menu</button>
    </template>
    <template #default>
      <button role="menuitem" data-testid="item-apple" @click="selected = 'apple'">Apple</button>
      <button role="menuitem" data-testid="item-banana" @click="selected = 'banana'">Banana</button>
      <button role="menuitem" data-testid="item-date" data-keep-open @click="selected = 'date'">
        Date
      </button>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Menu from '../../src/components/Menu/Menu.vue'

const open = shallowRef(false)
const selected = shallowRef('')
</script>
