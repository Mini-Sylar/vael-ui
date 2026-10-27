<template>
  <section class="demo">
    <h3>Checkboxes: <code>selectionMode="checkbox"</code>, with indeterminate parents</h3>
    <p class="note">
      Checking a folder checks every enabled file inside it. When only some of a folder's files are
      checked, the folder's checkbox shows as indeterminate, using the same
      <code>Checkbox</code> component as DataTable's select-all header. The
      <code>node_modules</code> folder is disabled: you can't reach anything inside it, and it never
      counts toward a parent's indeterminate state.
    </p>
    <div class="row">
      <Field label="Files">
        <TreeSelect
          v-model="checkboxValues"
          :items="fileTree"
          selection-mode="checkbox"
          placeholder="Pick files"
        />
      </Field>
      <output class="panel-text">
        {{ selectionSummary }}
      </output>
    </div>
    <p v-if="checkboxValues.length" class="demo-status">{{ checkboxValues.join(', ') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Field, TreeSelect } from 'vael-ui'
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

// Checkbox mode keeps only leaves (files) in the model, so its length is the file count,
// including files inside collapsed subfolders.
const checkboxValues = shallowRef<(string | number)[]>([])
const selectionSummary = computed(() => {
  const count = checkboxValues.value.length
  if (count === 0) return 'Nothing selected yet'
  return `${count} ${count === 1 ? 'file' : 'files'} selected`
})
</script>

<style scoped>
.row {
  display: flex;
  align-items: last baseline;
  gap: 1rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
