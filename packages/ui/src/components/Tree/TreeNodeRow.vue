<template>
  <!-- Real box, not `display: contents` — needed as a containing block for
       the children block's absolute leave-active (see Tree.css). -->
  <div class="ui-tree-node">
    <div
      role="treeitem"
      tabindex="-1"
      :data-tree-value="String(node.value)"
      :class="[part.class, isSticky && 'ui-tree-row--sticky']"
      :style="[indentStyle(depth), part.style, isSticky ? stickyStyle : undefined]"
      :aria-level="depth + 1"
      :aria-expanded="hasChildren ? expanded : undefined"
      :aria-disabled="node.disabled || undefined"
      :aria-selected="ctx.selectionMode !== 'checkbox' ? (checked ? 'true' : 'false') : undefined"
      :aria-checked="ctx.selectionMode === 'checkbox' ? ariaChecked : undefined"
      :aria-roledescription="ctx.reorderable ? 'draggable tree item' : undefined"
      :data-dragging="dragging || undefined"
      :data-drop-into="dropInto || undefined"
      :data-drop-edge="dropEdge"
      @click="ctx.onRowClick(node, $event)"
      @pointerdown="ctx.onRowPointerdown?.(node, $event)"
    >
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
    <!-- Leaves skip the Transition: on a large tree that's thousands of idle components. -->
    <Transition
      v-if="hasChildren"
      :name="ctx.motionCss ? 'ui-tree-rows' : undefined"
      :css="!ctx.forceMount"
      appear
    >
      <div
        v-if="ctx.forceMount || expanded"
        v-show="!ctx.forceMount || expanded"
        class="ui-tree-rows"
        :data-state="expanded ? 'open' : 'closed'"
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
    </Transition>
  </div>
</template>

<!-- Recursive per-node renderer, one real DOM level per tree level — what
     lets stickyScroll use native `position: sticky` instead of a JS-measured
     overlay. The #node slot is relayed at every level so Tree.vue's own
     <slot name="node"> stays the one place fallback content is defined. -->
<script setup lang="ts">
import { computed, inject } from 'vue'
import { treeRowContextKey } from './Tree.vue'
import type { TreeNode } from './Tree.vue'
import TreeNodeRow from './TreeNodeRow.vue'

const props = defineProps<{
  node: TreeNode
  depth: number
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
// Reuses the previous array when unchanged, so a filter keystroke skips untouched folders.
const visibleChildren = computed<readonly TreeNode[]>((previous) => {
  const next = props.node.children?.filter((child) => ctx.isVisible(child)) ?? []
  if (previous?.length === next.length && next.every((child, index) => child === previous[index]))
    return previous
  return next
})
const isSticky = computed(
  () => ctx.stickyScroll && hasChildren.value && props.depth < ctx.maxStickyDepth,
)
const stickyStyle = computed(() => ({
  position: 'sticky' as const,
  top: `calc(var(--ui-tree-row-height) * ${props.depth})`,
}))

function indentStyle(depth: number) {
  return depth > 0 ? { '--ui-tree-depth': depth } : undefined
}
</script>
