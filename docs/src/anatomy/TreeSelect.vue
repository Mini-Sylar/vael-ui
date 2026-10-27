<!-- TreeSelect open with every part: the trigger and its value, and a panel with a header and footer. -->
<template>
  <div data-specimen class="specimen">
    <TreeSelect
      ref="tree"
      v-model="file"
      v-model:open="open"
      :items="files"
      :filterable="false"
      :close-on-outside="false"
      aria-label="Document"
    >
      <template #header>Shared with the team</template>
      <template #footer>
        <Button variant="ghost" size="sm">
          <template #leading><PhFolderPlus /></template>
          New folder
        </Button>
      </template>
    </TreeSelect>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { Button, TreeSelect } from 'vael-ui'
import type { TreeSelectNode } from 'vael-ui'
import { PhFolderPlus } from '@phosphor-icons/vue'

const files: TreeSelectNode[] = [
  {
    label: 'Design',
    value: 'design',
    children: [
      { label: 'Brand guide.pdf', value: 'design/brand' },
      { label: 'Icons.fig', value: 'design/icons' },
    ],
  },
  {
    label: 'Finance',
    value: 'finance',
    children: [{ label: 'Q3 budget.xlsx', value: 'finance/q3' }],
  },
  { label: 'Roadmap.md', value: 'roadmap' },
]
const file = ref('design/brand')
// Open from the start, and kept open while you point at its parts.
const open = ref(true)
// One folder unfolded, so the tree reads as a tree.
const tree = useTemplateRef('tree')
onMounted(() => tree.value?.expandNode('design'))
</script>

<style scoped>
.specimen {
  inline-size: min(18rem, 100%);
  min-block-size: 20rem;
}
</style>
