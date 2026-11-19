<template>
  <section class="demo">
    <h3>Move to a folder, never into itself</h3>
    <p class="note">
      Choose a folder and where to put it. <code>moveTreeNode</code> refuses a folder inside its own
      subtree, which would detach the branch and lose it; <code>isDescendantOf</code> is what it
      asks, and you can ask it too to leave those folders out of the list. Try moving
      <em>Projects</em> into <em>Drafts</em>.
    </p>
    <div class="row">
      <Field label="Move">
        <Select v-model="what" :items="options" aria-label="Folder to move" />
      </Field>
      <Field label="Into">
        <Select v-model="where" :items="targets" aria-label="Destination" />
      </Field>
      <Button size="sm" @click="go">Move</Button>
    </div>
    <pre class="tree" aria-label="Folders">{{ drawn }}</pre>
    <output class="demo-status" aria-live="polite">{{ status }}</output>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { Button, Field, Select, isDescendantOf, moveTreeNode } from 'vael-ui'
import type { TreeAccessors } from 'vael-ui'

// Not the default shape, so it passes accessors.
interface Folder {
  id: number
  name: string
  folders?: Folder[]
}
const accessors: TreeAccessors<Folder> = {
  getKey: (folder) => folder.id,
  getChildren: (folder) => folder.folders,
  setChildren: (folder, folders) => (folder.folders = folders),
}

const tree = ref<Folder[]>([
  {
    id: 1,
    name: 'Projects',
    folders: [
      { id: 2, name: 'Drafts', folders: [{ id: 5, name: 'Ideas' }] },
      { id: 3, name: 'Shipped' },
    ],
  },
  { id: 4, name: 'Archive' },
])
const what = shallowRef<number>(2)
const where = shallowRef<number>(4)
const status = shallowRef('')

const all = computed(() => {
  const out: Folder[] = []
  const walk = (folders: Folder[]) =>
    folders.forEach((folder) => {
      out.push(folder)
      walk(folder.folders ?? [])
    })
  walk(tree.value)
  return out
})
const options = computed(() => all.value.map((f) => ({ label: f.name, value: f.id })))
// Every folder is offered, so refusing is on show.
const targets = computed(() => options.value.filter((o) => o.value !== what.value))

function go() {
  const moved = moveTreeNode(
    tree.value,
    what.value,
    { parentValue: where.value, index: 0, depth: 0 },
    accessors,
  )
  const name = (id: number) => all.value.find((f) => f.id === id)?.name
  status.value = moved
    ? `Moved ${name(what.value)} into ${name(where.value)}.`
    : isDescendantOf(tree.value, what.value, where.value, accessors)
      ? `${name(where.value)} is inside ${name(what.value)}, so nothing moved.`
      : 'Nothing moved.'
}

const drawn = computed(() => {
  const lines: string[] = []
  const walk = (folders: Folder[], depth: number) =>
    folders.forEach((folder) => {
      lines.push(`${'  '.repeat(depth)}${folder.name}/`)
      walk(folder.folders ?? [], depth + 1)
    })
  walk(tree.value, 0)
  return lines.join('\n')
})
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}
.tree {
  max-inline-size: 22rem;
  margin: 0.75rem 0 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-muted);
  font-size: 0.8125rem;
}
</style>
