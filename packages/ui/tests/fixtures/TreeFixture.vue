<template>
  <output data-testid="model">{{ JSON.stringify(model) }}</output>
  <Tree
    v-model="model"
    :items="resolvedItems"
    :selection-mode="selectionMode"
    :filterable="filterable"
  />
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import Tree from '../../src/components/Tree.vue'
import type { TreeNode, TreeSelectionMode } from '../../src/components/Tree.vue'

const props = withDefaults(
  defineProps<{
    selectionMode?: TreeSelectionMode
    filterable?: boolean
    items?: TreeNode[]
  }>(),
  { selectionMode: 'single', filterable: true, items: undefined },
)

// Same shape as TreeSelectFixture's own default data — the two components
// share one tree-body implementation, so the same nested fixture data
// exercises both.
const defaultItems: TreeNode[] = [
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
</script>
