<template>
  <div data-testid="target" style="inline-size: 200px; block-size: 100px; background: #eee">
    <ContextMenu :items="items" :disabled="disabled" v-model:open="open" @select="onSelect">
      Right-click me
    </ContextMenu>
  </div>
  <output data-testid="selected">{{ selected }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import ContextMenu from '../../src/components/ContextMenu/ContextMenu.vue'
import type { MenuItemData } from '../../src/components/Menu.vue'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })

const open = shallowRef(false)
const selected = shallowRef('')
function onSelect(item: MenuItemData) {
  selected.value = item.value as string
}

const items: MenuItemData[] = [
  { label: 'Rename', value: 'rename' },
  { label: 'Duplicate', value: 'duplicate' },
  { label: 'Delete', value: 'delete', danger: true },
]
</script>
