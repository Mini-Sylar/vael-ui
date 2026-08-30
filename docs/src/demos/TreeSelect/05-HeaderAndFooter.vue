<template>
  <section class="demo">
    <h3>Header and footer around the tree</h3>
    <p class="note">
      Same flex-column panel restructure as Select and Menu — <code>#header</code>/
      <code>#footer</code> stay fixed above/below the tree, which stays the one scrolling piece.
    </p>
    <div class="row">
      <TreeSelect v-model="value" :items="fileTree" placeholder="Pick a file or folder">
        <template #header>
          <span class="hint">Type to filter, or browse below</span>
        </template>
        <template #footer>
          <span class="hint">node_modules is excluded from search</span>
        </template>
      </TreeSelect>
      <output class="panel-text">
        {{ value ? `Selected: ${value}` : 'Nothing selected yet' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { TreeSelect } from 'vael-ui'
import type { TreeSelectNode } from 'vael-ui'

const fileTree: TreeSelectNode[] = [
  {
    label: 'src',
    value: 'src',
    children: [
      { label: 'Button.vue', value: 'src/Button.vue' },
      { label: 'Input.vue', value: 'src/Input.vue' },
    ],
  },
  {
    label: 'docs',
    value: 'docs',
    children: [{ label: 'README.md', value: 'docs/README.md' }],
  },
  {
    label: 'node_modules',
    value: 'node_modules',
    disabled: true,
    children: [{ label: 'vue', value: 'node_modules/vue', disabled: true }],
  },
  { label: 'package.json', value: 'package.json' },
]

const value = shallowRef<string | number | null>(null)
</script>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
}

.panel-text {
  font-size: 0.8125rem;
}

.hint {
  font-size: 0.75rem;
}
</style>
