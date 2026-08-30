<template>
  <output data-testid="selected">{{ selected }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <Menu
    v-model:open="open"
    :items="items"
    :max-panel-height="maxPanelHeight"
    @select="selected = $event.value ?? ''"
  >
    <template #trigger>
      <button data-testid="trigger">open menu</button>
    </template>
    <template v-if="withHeader" #header>
      <span data-testid="menu-header">header content</span>
    </template>
    <template v-if="withFooter" #footer>
      <span data-testid="menu-footer">footer content</span>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Menu from '../../src/components/Menu/Menu.vue'
import type { MenuEntry } from '../../src/components/Menu/Menu.vue'

const props = withDefaults(
  defineProps<{
    itemCount?: number
    withHeader?: boolean
    withFooter?: boolean
    maxPanelHeight?: number
  }>(),
  { withHeader: false, withFooter: false, maxPanelHeight: undefined },
)

const items: MenuEntry[] = props.itemCount
  ? Array.from({ length: props.itemCount }, (_, i) => ({ label: `Item ${i}`, value: `item-${i}` }))
  : [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry', disabled: true },
      { type: 'separator' },
      { label: 'Date', value: 'date', keepOpen: true },
    ]

const open = shallowRef(false)
const selected = shallowRef('')
</script>
