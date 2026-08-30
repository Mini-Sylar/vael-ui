<template>
  <section class="demo">
    <h3>Drop a tab onto another to group them</h3>
    <p>
      Hover near a tab's edge to reorder past it, same as any flat list. Hover its middle and
      <code>dropOnTarget</code> (already used by <code>Tree</code> for VS Code-style folder drops)
      resolves the same "inside" intent here — turning a plain tab into a group's first child is
      application logic (<code>onCommit</code> below), not new engine code. A grouped tab drags out
      the same way; a group left with one tab dissolves back into a plain tab. Every row, at every
      depth, is one flat sibling list — same as <code>Tree</code> — so a tab moving between groups
      is a reorder Vue can patch in place, not a remount, which is what lets it actually animate.
    </p>
    <ul ref="listEl" class="tab-strip">
      <li
        v-for="row in renderRows"
        :key="row.id"
        :data-tab-item="row.id"
        class="tab-slot"
        :class="{
          'tab-slot--child': row.depth > 0,
          'tab-slot--carried': draggedValues.has(row.id),
        }"
      >
        <button
          v-if="row.isGroup"
          class="tab-handle tab-handle--group"
          :class="{ 'tab-handle--drop-target': dropIntoValue === row.id }"
          :aria-label="row.label"
          @pointerdown="onSortablePointerdown($event, row.id)"
          @keydown="onSortableKeydown($event, row.id)"
        >
          <PhFolder :size="14" />
          {{ row.label }}
        </button>
        <button
          v-else
          class="tab-handle"
          :class="{
            'tab-handle--child': row.depth > 0,
            'tab-handle--drop-target': dropIntoValue === row.id,
          }"
          :aria-label="row.label"
          @pointerdown="onSortablePointerdown($event, row.id)"
          @keydown="onSortableKeydown($event, row.id)"
        >
          {{ row.label }}
        </button>
      </li>
      <span :id="instructionsId" class="tab-strip-status">{{
        messages.sortable.instructions
      }}</span>
      <span class="tab-strip-status" role="status" aria-live="assertive" aria-atomic="true">{{
        announcement
      }}</span>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import { useSortable, useUiMessages } from 'vael-ui'
import type { FlatSortableRow } from 'vael-ui'
import { PhFolder } from '@phosphor-icons/vue'

interface TabNode {
  id: string
  label: string
  children?: TabNode[]
}

const tabs = ref<TabNode[]>([
  { id: 't1', label: 'Overview' },
  { id: 't2', label: 'Activity' },
  { id: 't3', label: 'Settings' },
  { id: 't4', label: 'Billing' },
])

const messages = useUiMessages()
const instructionsId = useId()
const listEl = useTemplateRef<HTMLElement>('listEl')

function findTopIndex(id: string | number): number {
  return tabs.value.findIndex((node) => node.id === id)
}
function findNode(id: string | number): TabNode | undefined {
  for (const node of tabs.value) {
    if (node.id === id) return node
    const child = node.children?.find((c) => c.id === id)
    if (child) return child
  }
  return undefined
}
function elementFor(value: string | number): HTMLElement | null {
  return listEl.value?.querySelector(`[data-tab-item="${CSS.escape(String(value))}"]`) ?? null
}

/** Removes `id` from wherever it lives and returns it. A group left with
 * exactly one child dissolves back into a plain tab in its place. */
function detach(id: string | number): TabNode | null {
  const topIndex = findTopIndex(id)
  if (topIndex !== -1) return tabs.value.splice(topIndex, 1)[0]!
  for (const node of tabs.value) {
    if (!node.children) continue
    const childIndex = node.children.findIndex((c) => c.id === id)
    if (childIndex === -1) continue
    const [child] = node.children.splice(childIndex, 1)
    if (node.children.length === 1) {
      tabs.value.splice(tabs.value.indexOf(node), 1, node.children[0]!)
    }
    return child!
  }
  return null
}

/** One flat sibling list at every depth — a row moving between groups (or a
 * plain tab getting promoted into one) is then a reorder within this same
 * list from Vue's perspective, not an unmount from one v-for into another,
 * which is what actually lets the drop animate instead of snapping. */
interface RenderRow {
  id: string | number
  label: string
  depth: number
  isGroup: boolean
}
const renderRows = computed<RenderRow[]>(() => {
  const flat: RenderRow[] = []
  for (const node of tabs.value) {
    flat.push({ id: node.id, label: node.label, depth: 0, isGroup: !!node.children })
    for (const child of node.children ?? []) {
      flat.push({ id: child.id, label: child.label, depth: 1, isGroup: false })
    }
  }
  return flat
})
const rows = computed<FlatSortableRow[]>(() =>
  renderRows.value.map((row) => ({
    value: row.id,
    depth: row.depth,
    parentValue:
      row.depth > 0 ? tabs.value.find((n) => n.children?.some((c) => c.id === row.id))!.id : null,
  })),
)

let groupCount = 0

const {
  dropIntoValue,
  draggedValues,
  announcement,
  onHandlePointerdown: onSortablePointerdown,
  onHandleKeydown: onSortableKeydown,
} = useSortable({
  rows,
  getElement: elementFor,
  container: () => listEl.value,
  axis: 'x',
  nested: true,
  dropOnTarget: true,
  // Wider than Tree's own 0.25 default — a tab is a small target, and the
  // strip reflowing as you approach makes precise aim harder than a tall
  // vertical row does. 0.1 gives an 80%-wide "drop into" zone.
  nestEdgeFraction: 0.1,
  dragPreview: true,
  // Only a top-level tab (plain or already a group) can receive a drop —
  // a child chip can be reordered among its siblings but not nested again.
  // And only a plain tab can BE nested — a group being dragged carries its
  // own children (`draggedValues` is more than just itself), and grouping a
  // group would need two nesting levels the flat render model doesn't do.
  canNestInto: (value) => draggedValues.value.size <= 1 && findTopIndex(value) !== -1,
  labelOf: (value) => findNode(value)?.label ?? String(value),
  childCountOf: (value) => findNode(value)?.children?.length ?? 0,
  announce: (event) =>
    messages.value.sortable[
      event.kind === 'grab'
        ? 'grabbed'
        : event.kind === 'move'
          ? 'moved'
          : event.kind === 'drop'
            ? 'dropped'
            : 'cancelled'
    ]
      .replace('{label}', event.label)
      .replace('{position}', String(event.position))
      .replace('{total}', String(event.total)),
  onCommit: (value, to) => {
    const dragged = detach(value)
    if (!dragged) return

    if (to.parentValue == null) {
      tabs.value.splice(Math.min(Math.max(to.index, 0), tabs.value.length), 0, dragged)
      return
    }

    const targetIndex = findTopIndex(to.parentValue)
    if (targetIndex === -1) {
      // Target vanished mid-drag (shouldn't happen) — don't lose the tab.
      tabs.value.push(dragged)
      return
    }
    const target = tabs.value[targetIndex]!
    if (target.children) {
      target.children.splice(Math.min(Math.max(to.index, 0), target.children.length), 0, dragged)
    } else {
      groupCount++
      tabs.value.splice(targetIndex, 1, {
        id: `group-${groupCount}`,
        label: `Group ${groupCount}`,
        children: [target, dragged],
      })
    }
  },
})
</script>

<style scoped>
.tab-strip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  padding: 0.375rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-muted);
  list-style: none;
  inline-size: fit-content;
}
.tab-slot {
  display: flex;
}
.tab-slot--child {
  margin-inline-start: -0.25rem;
}
.tab-slot--carried {
  /* useSortable's own floating clone already carries copies of a dragged
     group's children along with it (`previewCarriesSubtree`, on by default
     for any `dragPreview` + `nested` list) — so the real rows just hide in
     place for the duration, the same as the dragged row itself. `visibility`,
     not `display`, so they keep their layout space: the other tabs' shift-
     springs already exclude this whole subtree from their gap math, and
     expect that same slot still sitting there to animate around. */
  visibility: hidden;
}
.tab-handle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) - 4px);
  background: var(--ui-surface);
  color: var(--ui-text);
  font: inherit;
  font-size: 0.8125rem;
  cursor: grab;
  touch-action: none;
}
.tab-handle--group {
  font-weight: 600;
}
.tab-handle--child {
  padding: 0.375rem 0.625rem;
  border-color: transparent;
  border-inline-start: 2px solid var(--ui-border-strong);
  border-radius: 0 calc(var(--ui-radius) - 6px) calc(var(--ui-radius) - 6px) 0;
  background: var(--ui-muted);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.tab-handle--drop-target {
  border-color: var(--ui-primary);
  background: color-mix(in oklch, var(--ui-primary) 10%, var(--ui-surface));
}
.tab-strip-status {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
