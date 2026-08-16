<template>
  <output data-testid="model">{{ JSON.stringify(model) }}</output>
  <output data-testid="node-model">{{ nodeModelLabels }}</output>
  <div :style="height ? { blockSize: height, display: 'flex' } : undefined">
    <Tree
      ref="treeRef"
      v-model="model"
      v-model:node="nodeModel"
      :items="resolvedItems"
      :selection-mode="selectionMode"
      :filterable="filterable"
      :expand-on-row-click="expandOnRowClick"
      :sticky-scroll="stickyScroll"
      :selectable-folders="selectableFolders"
    />
  </div>
  <!-- Below the tree so `userEvent.tab()` from body still reaches the
       filter input first, matching real tab order. -->
  <button data-testid="call-expand-all" @click="treeRef?.expandAll()">expandAll()</button>
  <button data-testid="call-collapse-all" @click="treeRef?.collapseAll()">collapseAll()</button>
  <button data-testid="call-expand-root" @click="treeRef?.expandNode('root')">
    expandNode('root')
  </button>
  <button data-testid="call-collapse-root" @click="treeRef?.collapseNode('root')">
    collapseNode('root')
  </button>
  <output data-testid="find-result">{{ findResult }}</output>
  <button
    data-testid="call-find-leaf-a"
    @click="findResult = treeRef?.findNode('leafA')?.label ?? 'none'"
  >
    findNode('leafA')
  </button>
  <button
    data-testid="call-find-parent-leaf-a"
    @click="findResult = String(treeRef?.findParent('leafA')?.value ?? 'none')"
  >
    findParent('leafA')
  </button>
  <button
    data-testid="call-remove-leaf-a"
    @click="findResult = String(treeRef?.removeNode('leafA'))"
  >
    removeNode('leafA')
  </button>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import Tree from '../../src/components/Tree/Tree.vue'
import type { TreeNode, TreeSelectionMode } from '../../src/components/Tree/Tree.vue'

const props = withDefaults(
  defineProps<{
    selectionMode?: TreeSelectionMode
    filterable?: boolean
    items?: TreeNode[]
    expandOnRowClick?: boolean
    stickyScroll?: boolean
    selectableFolders?: boolean
    height?: string
  }>(),
  {
    selectionMode: 'single',
    filterable: true,
    items: undefined,
    expandOnRowClick: false,
    stickyScroll: false,
    selectableFolders: true,
    height: undefined,
  },
)

const treeRef = useTemplateRef<{
  expandAll: () => void
  collapseAll: () => void
  expandNode: (value: string | number) => void
  collapseNode: (value: string | number) => void
  findNode: (value: string | number) => TreeNode | undefined
  findParent: (value: string | number) => TreeNode | null
  removeNode: (value: string | number) => boolean
}>('treeRef')
const findResult = shallowRef('')

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
const nodeModel = shallowRef<TreeNode | TreeNode[] | null>(null)
const nodeModelLabels = computed(() =>
  Array.isArray(nodeModel.value)
    ? nodeModel.value.map((n) => n.label).join(',')
    : (nodeModel.value?.label ?? 'null'),
)
</script>
