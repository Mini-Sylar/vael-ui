<template>
  <section class="demo">
    <h2>TreeSelect</h2>
    <p class="note">
      Select's own trigger/positioner/panel chrome, wrapping a real expandable tree instead of a
      flat listbox — arrow keys rove between rows, ArrowRight/ArrowLeft expand and collapse, and the
      search box auto-expands ancestors of any label match. Try it with a keyboard: open a panel,
      then ArrowDown/ArrowRight/ArrowLeft/Enter.
    </p>

    <h3>Single-select — <code>selectionMode="single"</code></h3>
    <p class="note">
      Picking any node (folder or file) replaces the selection and closes the panel.
    </p>
    <div class="row">
      <TreeSelect v-model="singleValue" :items="fileTree" placeholder="Pick a file or folder" />
      <output class="panel-text">
        {{ singleValue ? `Selected: ${singleValue}` : 'Nothing selected yet' }}
      </output>
    </div>

    <h3>Checkbox — <code>selectionMode="checkbox"</code>, indeterminate parents</h3>
    <p class="note">
      Checking a folder cascades to every enabled file beneath it; checking some-but-not-all of a
      folder's files renders that folder's own checkbox as indeterminate via the real
      <code>Checkbox</code> component — the same one DataTable's select-all header uses. The
      <code>node_modules</code> folder is disabled: its whole subtree is unreachable and never
      participates in a parent's indeterminate count.
    </p>
    <div class="row">
      <TreeSelect
        v-model="checkboxValues"
        :items="fileTree"
        selection-mode="checkbox"
        placeholder="Pick files"
      />
      <output class="panel-text">
        {{
          checkboxValues.length
            ? `${checkboxValues.length} file(s) selected`
            : 'Nothing selected yet'
        }}
      </output>
    </div>
    <p v-if="checkboxValues.length" class="note">{{ checkboxValues.join(', ') }}</p>

    <h3>Multiple — <code>selectionMode="multiple"</code>, no cascading</h3>
    <p class="note">
      Each click toggles just that one node's own membership in the array — no checkboxes, no
      parent/child linkage, no indeterminate state. Useful when a consumer wants multi-pick without
      the checkbox-tree semantics above.
    </p>
    <div class="row">
      <TreeSelect
        v-model="multipleValues"
        :items="fileTree"
        selection-mode="multiple"
        placeholder="Pick any nodes"
      />
      <output class="panel-text">
        {{
          multipleValues.length
            ? `${multipleValues.length} node(s) selected`
            : 'Nothing selected yet'
        }}
      </output>
    </div>

    <h3>Disabled + <code>#value</code> slot override</h3>
    <p class="note">
      Same "standalone-or-Field" contract as every other control — wire it into a Field and
      label/description/required wiring appears for free, or leave it disabled entirely.
    </p>
    <Field label="Project entry point" description="Read-only for this demo" :required="true">
      <TreeSelect
        :items="fileTree"
        model-value="index.html"
        disabled
        placeholder="Pick an entry point"
      />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
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

const singleValue = shallowRef<string | number | null>(null)
const checkboxValues = shallowRef<(string | number)[]>([])
const multipleValues = shallowRef<(string | number)[]>([])
</script>
