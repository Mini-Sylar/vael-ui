<template>
  <!-- Real box, not `display: contents` — needed as a containing block for
       the children block's absolute leave-active (see Tree.css). -->
  <div class="ui-tree-node">
    <div
      role="treeitem"
      tabindex="-1"
      :data-tree-value="String(node.value)"
      :class="[ctx.nodePart(node).class, isSticky && 'ui-tree-row--sticky']"
      :style="[indentStyle(depth), ctx.nodePart(node).style, isSticky ? stickyStyle : undefined]"
      :aria-level="depth + 1"
      :aria-expanded="hasChildren ? ctx.isExpanded(node) : undefined"
      :aria-disabled="node.disabled || undefined"
      :aria-selected="
        ctx.selectionMode !== 'checkbox' ? (ctx.isCheckedNode(node) ? 'true' : 'false') : undefined
      "
      :aria-checked="ctx.selectionMode === 'checkbox' ? ctx.ariaChecked(node) : undefined"
      @click="ctx.onRowClick(node, $event)"
    >
      <slot
        name="node"
        :node="node"
        :depth="depth"
        :expanded="hasChildren && ctx.isExpanded(node)"
        :checked="ctx.isCheckedNode(node)"
        :indeterminate="ctx.isIndeterminateNode(node)"
        :disabled="!!node.disabled"
        :toggle-expand="() => ctx.toggleExpand(node)"
        :toggle-select="() => ctx.activateNode(node)"
        :find-node="ctx.findNode"
        :find-parent="ctx.findParent"
        :remove-node="ctx.removeNode"
      />
    </div>
    <Transition :name="ctx.motionCss ? 'ui-tree-rows' : undefined" appear>
      <div v-if="hasChildren && ctx.isExpanded(node)" class="ui-tree-rows">
        <TreeNodeRow
          v-for="child in visibleChildren"
          :key="String(child.value)"
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
const visibleChildren = computed(
  () => props.node.children?.filter((child) => ctx.isVisible(child)) ?? [],
)
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
