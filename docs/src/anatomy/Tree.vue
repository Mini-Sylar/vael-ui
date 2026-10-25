<!-- Tree with every part: the filter, folders with chevrons, one expanded, and a second tree showing the empty state. -->
<template>
  <div data-specimen class="specimen">
    <span class="heading">Projects</span>
    <Tree
      ref="tree"
      v-model="selected"
      :items="projects"
      filter-placeholder="Filter files"
      aria-label="Projects"
    />
    <span class="heading">Shared with you</span>
    <Tree :items="[]" :filterable="false" empty-text="Nothing shared yet" aria-label="Shared" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef } from 'vue'
import { Tree } from 'vael-ui'

const projects = [
  {
    label: 'Design',
    value: 'design',
    children: [
      { label: 'Brand guide.pdf', value: 'brand-guide' },
      { label: 'Logo.svg', value: 'logo' },
    ],
  },
  {
    label: 'Engineering',
    value: 'engineering',
    children: [{ label: 'Release notes.md', value: 'release-notes' }],
  },
  { label: 'Roadmap.md', value: 'roadmap' },
]
const selected = shallowRef('logo')

// Expanded state is the tree's own: open the first folder through its exposed method.
const tree = useTemplateRef('tree')
onMounted(() => tree.value?.expandNode('design'))
</script>

<style scoped>
.specimen {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  inline-size: min(18rem, 100%);
}
.heading {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-text-muted);
}
.heading:not(:first-child) {
  margin-block-start: 0.5rem;
}
</style>
