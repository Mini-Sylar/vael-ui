<template>
  <div class="ui-tree-node">
    <!-- A pinned copy (a large tree's sticky row) is for the eye only: the real row stays in the
         list, so the copy is hidden from screen readers and can't take focus. -->
    <div
      :role="pinned ? undefined : 'treeitem'"
      :tabindex="pinned ? undefined : -1"
      :data-tree-value="pinned ? undefined : String(node.value)"
      :data-tree-pinned="pinned || undefined"
      :aria-hidden="pinned || undefined"
      :class="[part.class, (isSticky || pinned) && 'ui-tree-row--sticky']"
      :style="[indentStyle(depth), part.style, isSticky ? stickyStyle : undefined]"
      :aria-level="pinned ? undefined : depth + 1"
      :aria-setsize="pinned ? undefined : setSize"
      :aria-posinset="pinned ? undefined : posInSet"
      :aria-expanded="hasChildren && !pinned ? expanded : undefined"
      :aria-disabled="(!pinned && node.disabled) || undefined"
      :aria-selected="
        !pinned && ctx.selectionMode !== 'checkbox' ? (checked ? 'true' : 'false') : undefined
      "
      :aria-checked="!pinned && ctx.selectionMode === 'checkbox' ? ariaChecked : undefined"
      :aria-roledescription="ctx.reorderable && !pinned ? 'draggable tree item' : undefined"
      :data-dragging="dragging || undefined"
      :data-drop-into="dropInto || undefined"
      :data-drop-edge="dropEdge"
      @click="ctx.onRowClick(node, $event)"
      @pointerdown="ctx.onRowPointerdown?.(node, $event)"
    >
      <span
        v-if="ctx.selectionMode === 'single' && checked"
        class="ui-tree-row-highlight"
        aria-hidden="true"
      />
      <slot
        name="node"
        :node="node"
        :depth="depth"
        :expanded="expanded"
        :checked="checked"
        :indeterminate="indeterminate"
        :disabled="!!node.disabled"
        :toggle-expand="() => ctx.toggleExpand(node)"
        :toggle-select="() => ctx.activateNode(node)"
        :find-node="ctx.findNode"
        :find-parent="ctx.findParent"
        :remove-node="ctx.removeNode"
      />
    </div>
    <!-- A closing block stays while it folds shut (useFold). With forceMount it's always there and
         `data-state` is yours to animate. -->
    <div
      v-if="!flat && hasChildren && (ctx.forceMount || expanded || folding)"
      v-show="!ctx.forceMount || expanded"
      ref="rowsEl"
      class="ui-tree-rows"
      :data-state="expanded ? 'open' : 'closed'"
      :data-folding="folding ? '' : undefined"
    >
      <!-- v-memo, as in Tree.vue: the relayed slot is dynamic. -->
      <TreeNodeRow
        v-for="child in visibleChildren"
        :key="String(child.value)"
        v-memo="[child, depth]"
        :node="child"
        :depth="depth + 1"
      >
        <template #node="scope">
          <slot name="node" v-bind="scope" />
        </template>
      </TreeNodeRow>
    </div>
  </div>
</template>

<!-- Recursive per-node renderer, one real DOM level per tree level — what
     lets stickyScroll use native `position: sticky` instead of a JS-measured
     overlay. The #node slot is relayed at every level so Tree.vue's own
     <slot name="node"> stays the one place fallback content is defined. -->
<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'
import { treeRowContextKey } from './Tree.vue'
import type { TreeNode } from './Tree.vue'
import TreeNodeRow from './TreeNodeRow.vue'
import { useFold } from '../../composables/useFold'

const props = defineProps<{
  node: TreeNode
  depth: number
  /** Just this row, placed by a large tree's flat list; its children are rows of their own. */
  flat?: boolean
  /** This row among its siblings, for a flat list, where the DOM doesn't say it. */
  setSize?: number
  posInSet?: number
  /** A copy pinned over a large tree's list for sticky scroll. */
  pinned?: boolean
}>()

defineSlots<{
  node(props: {
    node: TreeNode
    depth: number
    expanded: boolean
    checked: boolean
    indeterminate: boolean
    disabled: boolean
    toggleExpand: () => void
    toggleSelect: () => void
    findNode: (value: string | number) => TreeNode | undefined
    findParent: (value: string | number) => TreeNode | null
    removeNode: (value: string | number) => boolean
  }): unknown
}>()

const ctx = inject(treeRowContextKey)!

const hasChildren = computed(() => !!props.node.children && props.node.children.length > 0)
// Tree-wide state is read through per-row computeds, so a change re-renders only the rows it affects.
const expanded = computed(() => hasChildren.value && ctx.isExpanded(props.node))
const checked = computed(() => ctx.isCheckedNode(props.node))
const indeterminate = computed(() => ctx.isIndeterminateNode(props.node))
const ariaChecked = computed(() =>
  indeterminate.value ? 'mixed' : checked.value ? 'true' : 'false',
)
const part = computed(() =>
  ctx.nodePart(props.node, ctx.selectionMode !== 'checkbox' && checked.value),
)
const dragging = computed(() => ctx.draggedValues.has(props.node.value))
const dropInto = computed(() => ctx.dropIntoValue === props.node.value)
const dropEdge = computed(() =>
  ctx.dropEdge?.value === props.node.value ? ctx.dropEdge.side : undefined,
)
const rowsEl = useTemplateRef<HTMLElement>('rowsEl')
const { folding } = useFold({
  scheduler: ctx.fold,
  el: () => rowsEl.value,
  open: () => expanded.value,
  motion: () => ctx.rowMotion && !ctx.forceMount && !props.flat,
  spring: () => ctx.foldSpring,
})

// Reuses the previous array when unchanged, so a filter keystroke skips untouched folders.
const visibleChildren = computed<readonly TreeNode[]>((previous) => {
  const next = props.node.children?.filter((child) => ctx.isVisible(child)) ?? []
  if (previous?.length === next.length && next.every((child, index) => child === previous[index]))
    return previous
  return next
})
// Native sticky for the nested rows only: a flat list pins copies instead.
const isSticky = computed(
  () =>
    !props.flat &&
    !props.pinned &&
    ctx.stickyScroll &&
    hasChildren.value &&
    props.depth < ctx.maxStickyDepth,
)
const stickyStyle = computed(() => ({
  position: 'sticky' as const,
  top: `calc(var(--ui-tree-row-height) * ${props.depth})`,
}))

function indentStyle(depth: number) {
  return depth > 0 ? { '--ui-tree-depth': depth } : undefined
}
</script>
