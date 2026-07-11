<template>
  <section class="demo">
    <h2>Tree</h2>
    <p class="note">
      The tree BODY extracted out of <code>TreeSelect</code>'s own popover panel (see its own SFC
      comment) so it can render on its own — no trigger button, no positioner, no Teleport. Same
      expand/collapse, checkbox-indeterminate, filter, and roving-keyboard-nav behavior either way,
      just permanently in the page flow instead of behind a click — a VS Code-style file-explorer
      sidebar is the case that motivated pulling it out. Try it with a keyboard: Tab into either
      tree below, then ArrowDown/ArrowRight/ArrowLeft/Enter.
    </p>

    <div class="tree-demo-shell">
      <div class="tree-demo-column">
        <h3>Single-select — <code>selectionMode="single"</code></h3>
        <p class="note">Picking any node (folder or file) replaces the selection.</p>
        <div class="tree-demo-sidebar">
          <Tree v-model="singleValue" :items="fileTree" />
        </div>
        <output class="panel-text">
          {{ singleValue ? `Selected: ${singleValue}` : 'Nothing selected yet' }}
        </output>
      </div>

      <div class="tree-demo-column">
        <h3>Checkbox — <code>selectionMode="checkbox"</code>, indeterminate parents</h3>
        <p class="note">
          Checking a folder cascades to every enabled file beneath it. <code>node_modules</code> is
          disabled: its whole subtree is unreachable and never participates in a parent's
          indeterminate count.
        </p>
        <div class="tree-demo-sidebar">
          <Tree v-model="checkboxValues" :items="fileTree" selection-mode="checkbox" />
        </div>
        <output class="panel-text">
          {{
            checkboxValues.length
              ? `${checkboxValues.length} file(s) selected`
              : 'Nothing selected yet'
          }}
        </output>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Tree } from 'vael-ui'
import type { TreeNode } from 'vael-ui'

// Same nested file/folder shape as TreeSelectDemo's own `fileTree` — the two
// components share one tree-body implementation (Tree.vue), so the same
// data plausibly exercises both the same way.
const fileTree: TreeNode[] = [
  {
    label: 'src',
    value: 'src',
    children: [
      {
        label: 'components',
        value: 'src/components',
        children: [
          { label: 'Button.vue', value: 'src/components/Button.vue' },
          { label: 'Input.vue', value: 'src/components/Input.vue' },
          {
            label: 'forms',
            value: 'src/components/forms',
            children: [
              { label: 'TextField.vue', value: 'src/components/forms/TextField.vue' },
              { label: 'Checkbox.vue', value: 'src/components/forms/Checkbox.vue' },
            ],
          },
        ],
      },
      {
        label: 'composables',
        value: 'src/composables',
        children: [
          { label: 'useAuth.ts', value: 'src/composables/useAuth.ts' },
          { label: 'useFetch.ts', value: 'src/composables/useFetch.ts' },
        ],
      },
      {
        label: 'pages',
        value: 'src/pages',
        children: [
          { label: 'Home.vue', value: 'src/pages/Home.vue' },
          { label: 'About.vue', value: 'src/pages/About.vue' },
          {
            label: 'admin',
            value: 'src/pages/admin',
            children: [
              { label: 'Dashboard.vue', value: 'src/pages/admin/Dashboard.vue' },
              { label: 'Settings.vue', value: 'src/pages/admin/Settings.vue' },
            ],
          },
        ],
      },
    ],
  },
  {
    label: 'docs',
    value: 'docs',
    children: [
      { label: 'README.md', value: 'docs/README.md' },
      { label: 'CONTRIBUTING.md', value: 'docs/CONTRIBUTING.md' },
    ],
  },
  {
    label: 'tests',
    value: 'tests',
    children: [
      {
        label: 'unit',
        value: 'tests/unit',
        children: [{ label: 'button.test.ts', value: 'tests/unit/button.test.ts' }],
      },
      {
        label: 'e2e',
        value: 'tests/e2e',
        children: [{ label: 'login.test.ts', value: 'tests/e2e/login.test.ts' }],
      },
    ],
  },
  {
    label: 'node_modules',
    value: 'node_modules',
    disabled: true,
    children: [
      { label: 'vue', value: 'node_modules/vue', disabled: true },
      { label: 'vite', value: 'node_modules/vite', disabled: true },
    ],
  },
  { label: 'package.json', value: 'package.json' },
  { label: 'index.html', value: 'index.html' },
]

const singleValue = shallowRef<string | number | null>(null)
const checkboxValues = shallowRef<(string | number)[]>([])
</script>

<style scoped>
.tree-demo-shell {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-start;
}
.tree-demo-column {
  flex: 1 1 20rem;
  min-inline-size: 18rem;
}
.tree-demo-sidebar {
  display: flex;
  flex-direction: column;
  block-size: 20rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  overflow: hidden;
  margin-block: 0.5rem;
}
</style>
