<template>
  <Tree
    ref="treeRef"
    :items="items"
    reorderable
    :reorder-siblings="reorderSiblings"
    :can-drop="canDrop"
    :before-drop="beforeDrop"
    :preview-mode="previewMode"
    @reorder="onReorder"
    @drop-error="dropErrors.push(String(($event as Error)?.message ?? $event))"
  />
  <output data-testid="shape">{{ shape(items) }}</output>
  <output data-testid="reorders">{{ reorders }}</output>
  <output data-testid="drop-errors">{{ dropErrors.join('|') }}</output>
</template>

<script setup lang="ts">
import { reactive, ref, useTemplateRef } from 'vue'
import Tree from '../../src/components/Tree/Tree.vue'
import type { TreeNode } from '../../src/components/Tree/Tree.vue'
import type { SortableDropDetails } from '../../src/composables/useSortable'

withDefaults(
  defineProps<{
    canDrop?: (d: SortableDropDetails) => boolean
    beforeDrop?: (d: SortableDropDetails) => boolean | Promise<boolean>
    reorderSiblings?: boolean
    previewMode?: 'element' | 'clone'
  }>(),
  { canDrop: undefined, beforeDrop: undefined, reorderSiblings: true, previewMode: undefined },
)

// a
// folder
//   f1
//   f2
// z
const items = reactive<TreeNode[]>([
  { label: 'a', value: 'a' },
  {
    label: 'folder',
    value: 'folder',
    children: [
      { label: 'f1', value: 'f1' },
      { label: 'f2', value: 'f2' },
    ],
  },
  { label: 'z', value: 'z' },
])

function shape(nodes: TreeNode[]): string {
  return nodes
    .map((n) =>
      n.children?.length ? `${n.value}(${shape(n.children as TreeNode[])})` : String(n.value),
    )
    .join(',')
}

const reorders = ref(0)
const dropErrors = ref<string[]>([])
function onReorder() {
  reorders.value++
}

const treeRef = useTemplateRef('treeRef')
defineExpose({ items, treeRef })
</script>
