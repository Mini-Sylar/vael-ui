<template>
  <section class="demo">
    <h3>Grow from what you clicked</h3>
    <p class="note">
      <code>origin="trigger"</code> zooms the dialog out of the element that opened it, and back
      into it on close, so a card looks like it expands into its details. It uses the drawer curve,
      so a <code>ConfigProvider</code> spring applies to it too. Reduced motion keeps a plain fade.
    </p>
    <div class="grid">
      <Card
        v-for="project in projects"
        :key="project.name"
        as="button"
        type="button"
        :title="project.name"
        :description="project.team"
        @click="openProject(project)"
      />
    </div>
    <Dialog
      v-model:open="open"
      origin="trigger"
      :title="current?.name"
      :description="current?.team"
    >
      <p>{{ current?.open }} open reviews, last updated {{ current?.updated }}.</p>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Card, Dialog } from 'vael-ui'

interface Project {
  name: string
  team: string
  open: number
  updated: string
}
const projects: Project[] = [
  { name: 'Northwind', team: 'Design', open: 3, updated: 'Monday' },
  { name: 'Halcyon', team: 'Marketing', open: 1, updated: 'last week' },
  { name: 'Meridian', team: 'Engineering', open: 5, updated: 'yesterday' },
  { name: 'Lantern', team: 'Research', open: 0, updated: 'today' },
]
const open = shallowRef(false)
const current = shallowRef<Project>()
function openProject(project: Project) {
  current.value = project
  open.value = true
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.75rem;
}
</style>
