<template>
  <button data-testid="before">Before</button>
  <Dock
    aria-label="Applications"
    :orientation="orientation"
    :magnify="magnify"
    :tooltip-side="tooltipSide"
    :items="items"
    @select="onSelect"
  />
  <button data-testid="after">After</button>
  <output data-testid="selected">{{ selected }}</output>
  <output data-testid="select-count">{{ selectCount }}</output>
</template>

<script setup lang="ts">
import { h, shallowRef } from 'vue'
import Dock from '../../src/components/Dock/Dock.vue'
import type { DockItemData } from '../../src/components/Dock/Dock.vue'
import type { Side } from '@floating-ui/dom'

withDefaults(
  defineProps<{ orientation?: 'horizontal' | 'vertical'; magnify?: boolean; tooltipSide?: Side }>(),
  {
    orientation: undefined,
    magnify: true,
    tooltipSide: undefined,
  },
)

const selected = shallowRef('')
const selectCount = shallowRef(0)

// Minimal stand-in icon component — the composable/component contract only
// cares that `icon` is a renderable Component, not what it draws.
const StarIcon = { name: 'StarIcon', render: () => h('svg', { 'data-testid': 'star-icon' }) }

let mailSelectCount = 0

const items: DockItemData[] = [
  { label: 'Finder', value: 'finder', icon: StarIcon },
  { label: 'Mail', value: 'mail', badge: 3, onSelect: () => (mailSelectCount += 1) },
  { label: 'Messages', value: 'messages' },
  { label: 'Notes', value: 'notes' },
  { label: 'Trash', value: 'trash', disabled: true },
]

function onSelect(item: DockItemData) {
  selected.value = item.value ?? ''
  selectCount.value += 1
}

defineExpose({ mailSelectCount: () => mailSelectCount })
</script>
