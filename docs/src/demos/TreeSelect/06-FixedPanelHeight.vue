<template>
  <section class="demo">
    <h3>Fixed panel height</h3>
    <p class="note">
      <code>maxPanelHeight</code> caps the panel at a set size regardless of how much viewport space
      is actually available — the tree scrolls internally past it instead of the panel growing to
      fill the screen.
    </p>
    <div class="row">
      <Field label="File">
        <TreeSelect
          v-model="value"
          :items="files"
          :max-panel-height="160"
          placeholder="Pick a file"
        />
      </Field>
      <output class="panel-text">{{
        value ? `Selected: ${value}` : 'Nothing selected yet'
      }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, TreeSelect } from 'vael-ui'
import type { TreeSelectNode } from 'vael-ui'

const files: TreeSelectNode[] = Array.from({ length: 40 }, (_, i) => ({
  label: `File ${i + 1}.ts`,
  value: `file-${i + 1}`,
}))

const value = shallowRef<string | number | null>(null)
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
