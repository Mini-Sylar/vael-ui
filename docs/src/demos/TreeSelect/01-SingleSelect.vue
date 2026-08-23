<template>
  <section class="demo">
    <h3>Single-select, <code>selectionMode="single"</code></h3>
    <p class="note">
      Picking any node (folder or file) replaces the selection and closes the panel.
    </p>
    <div class="row">
      <TreeSelect v-model="singleValue" :items="fileTree" placeholder="Pick a file or folder" />
      <output class="panel-text">
        {{ singleValue ? `Selected: ${singleValue}` : 'Nothing selected yet' }}
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
</script>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
