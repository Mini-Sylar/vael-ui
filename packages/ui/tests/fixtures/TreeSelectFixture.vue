<template>
  <output data-testid="model">{{ JSON.stringify(model) }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <TreeSelect
    v-model="model"
    v-model:open="open"
    :items="resolvedItems"
    :selection-mode="selectionMode"
    :disabled="disabled"
    :filterable="filterable"
    placeholder="Pick a node"
  />
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import TreeSelect from '../../src/components/TreeSelect.vue'
import type { TreeSelectNode, TreeSelectSelectionMode } from '../../src/components/TreeSelect.vue'

const props = withDefaults(
  defineProps<{
    selectionMode?: TreeSelectSelectionMode
    disabled?: boolean
    filterable?: boolean
    items?: TreeSelectNode[]
  }>(),
  { selectionMode: 'single', disabled: false, filterable: true, items: undefined },
)

const defaultItems: TreeSelectNode[] = [
  {
    label: 'Fruits',
    value: 'fruits',
    children: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      {
        label: 'Citrus',
        value: 'citrus',
        children: [
          { label: 'Orange', value: 'orange' },
          { label: 'Lemon', value: 'lemon', disabled: true },
        ],
      },
    ],
  },
  {
    label: 'Vegetables',
    value: 'vegetables',
    children: [
      { label: 'Carrot', value: 'carrot' },
      { label: 'Potato', value: 'potato' },
    ],
  },
]

const resolvedItems = computed(() => props.items ?? defaultItems)

const model = shallowRef<string | number | (string | number)[] | null>(
  props.selectionMode === 'single' ? null : [],
)
const open = shallowRef(false)
</script>
