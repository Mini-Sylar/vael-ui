<template>
  <section class="demo">
    <h3>An outline with indent and outdent</h3>
    <p class="note">
      Pick a line and move it with the buttons. Each one works out a
      <code>{ parentValue, index }</code> and hands it to <code>moveTreeNode</code>, which moves the
      line with everything under it. A move that can't happen, such as indenting the first line,
      returns <code>false</code> and changes nothing.
    </p>
    <div class="row">
      <Button size="sm" variant="outline" @click="up">Move up</Button>
      <Button size="sm" variant="outline" @click="down">Move down</Button>
      <Button size="sm" variant="outline" @click="indent">Indent</Button>
      <Button size="sm" variant="outline" @click="outdent">Outdent</Button>
    </div>
    <ul class="outline" role="listbox" aria-label="Outline">
      <li
        v-for="row in rows"
        :key="row.node.value"
        role="option"
        class="line"
        :class="{ 'line--picked': row.node.value === picked }"
        :aria-selected="row.node.value === picked"
        :style="{ paddingInlineStart: `${0.75 + row.depth * 1.25}rem` }"
        @click="picked = row.node.value"
      >
        {{ row.node.label }}
      </li>
    </ul>
    <output class="demo-status" aria-live="polite">{{ status }}</output>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { Button, moveTreeNode } from 'vael-ui'

// The default shape `moveTreeNode` reads: `value` and `children`.
interface Line {
  value: number
  label: string
  children?: Line[]
}
const tree = ref<Line[]>([
  {
    value: 1,
    label: 'Launch plan',
    children: [
      { value: 2, label: 'Write the announcement' },
      { value: 3, label: 'Record the demo' },
    ],
  },
  { value: 4, label: 'Docs' },
  { value: 5, label: 'Support rota' },
])
const picked = shallowRef(3)
const status = shallowRef('')

const rows = computed(() => {
  const out: { node: Line; depth: number }[] = []
  const walk = (nodes: Line[], depth: number) =>
    nodes.forEach((node) => {
      out.push({ node, depth })
      walk(node.children ?? [], depth + 1)
    })
  walk(tree.value, 0)
  return out
})

// Where the picked line sits: its parent, the lines beside it, and its place among them.
function locate(nodes: Line[], value: number, parent: Line | null = null): Where | null {
  for (const [index, node] of nodes.entries()) {
    if (node.value === value) return { parent, siblings: nodes, index }
    const inside = node.children && locate(node.children, value, node)
    if (inside) return inside
  }
  return null
}
interface Where {
  parent: Line | null
  siblings: Line[]
  index: number
}

function move(place: (at: Where) => { parentValue: number | null; index: number } | null) {
  const at = locate(tree.value, picked.value)
  const to = at && place(at)
  const moved = !!to && moveTreeNode(tree.value, picked.value, { ...to, depth: 0 })
  status.value = moved ? '' : "That line can't move there."
}

const up = () =>
  move(
    (at) =>
      (at.index > 0 && { parentValue: at.parent?.value ?? null, index: at.index - 1 }) || null,
  )
const down = () =>
  move(
    (at) =>
      (at.index < at.siblings.length - 1 && {
        parentValue: at.parent?.value ?? null,
        index: at.index + 1,
      }) ||
      null,
  )
// Becomes the last child of the line above it.
const indent = () =>
  move((at) => {
    const above = at.siblings[at.index - 1]
    return above ? { parentValue: above.value, index: above.children?.length ?? 0 } : null
  })
// Becomes the next sibling of its parent.
const outdent = () =>
  move((at) => {
    if (!at.parent) return null
    const parent = locate(tree.value, at.parent.value)!
    return { parentValue: parent.parent?.value ?? null, index: parent.index + 1 }
  })
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.outline {
  max-inline-size: 22rem;
  margin: 0.75rem 0 0.5rem;
  padding: 0.25rem;
  list-style: none;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.line {
  padding: 0.375rem 0.75rem;
  border-radius: calc(var(--ui-radius) - 4px);
  font-size: 0.875rem;
  cursor: pointer;
}
.line--picked {
  background: var(--ui-muted);
  font-weight: 600;
}
</style>
