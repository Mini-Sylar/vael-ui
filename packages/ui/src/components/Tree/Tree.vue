<template>
  <div
    class="ui-tree-root"
    v-bind="rootAttrs"
    :data-motion="props.motion ? undefined : 'off'"
    :data-rows="flatRows.length > STATIC_CONTROLS_ROWS && !virtual ? 'many' : undefined"
  >
    <div v-if="filterable" :class="filterPart.class" :style="filterPart.style">
      <Input
        ref="filterInputRef"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        v-model="query"
        :placeholder="filterPlaceholder"
        size="sm"
        :aria-label="filterPlaceholder"
        @keydown.down.prevent="focusFirstRow"
      >
        <template #start>
          <svg
            :class="filterIconPart.class"
            :style="filterIconPart.style"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M13 13l-2.5-2.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </template>
      </Input>
    </div>

    <div
      ref="listEl"
      :id="listId"
      role="tree"
      v-bind="treeAttrs"
      :aria-busy="loadingFlat || undefined"
      :data-reorderable="reorderable ? '' : undefined"
      :data-reordering="isReordering ? '' : undefined"
      :data-invalid-drop="isReordering && !isValidDrop ? '' : undefined"
      :data-drop-pending="isDropPending ? '' : undefined"
      :data-sticky="stickyScroll ? '' : undefined"
      :aria-multiselectable="selectionMode !== 'single' || undefined"
      :class="listPart.class"
      :style="listPart.style"
      v-scroll-mask="scrollFade"
      @keydown="onTreeKeydown"
    >
      <div
        ref="hoverEl"
        class="ui-indicator ui-tree-indicator"
        :style="hoverStyle"
        aria-hidden="true"
      />
      <div
        v-if="visibleRootNodes.length === 0"
        :class="emptyPart.class"
        :style="emptyPart.style"
        role="presentation"
      >
        <slot name="empty">{{ emptyText }}</slot>
      </div>
      <!-- Small trees nest each folder's rows in its own block. A large one is a flat list that
           renders only the rows in view, with the folders scrolled past pinned on top. -->
      <div
        v-else
        ref="rowsEl"
        :class="['ui-tree-rows', virtual && 'ui-tree-rows--virtual']"
        :style="virtual ? virtualTree?.spacerStyle.value : loadingFlat ? loadingRoom : undefined"
      >
        <!-- v-memo: the forwarded #node slot is dynamic, so without it each Tree re-render
             would re-render every row. Vapor ignores v-memo. -->
        <TreeNodeRow
          v-for="entry in renderEntries"
          :key="entry.key"
          v-memo="[
            entry.node,
            entry.depth,
            entry.y,
            entry.top,
            entry.setSize,
            entry.posInSet,
            virtual || loadingFlat,
          ]"
          :node="entry.node"
          :depth="entry.depth"
          :flat="virtual || loadingFlat"
          :pinned="entry.top !== undefined"
          :set-size="entry.setSize"
          :pos-in-set="entry.posInSet"
          :class="entry.top !== undefined ? 'ui-tree-pin' : undefined"
          :data-virtual-index="entry.index"
          :style="entry.style"
        >
          <template #node="scope">
            <slot
              name="node"
              :node="scope.node as T"
              :depth="scope.depth"
              :expanded="scope.expanded"
              :checked="scope.checked"
              :indeterminate="scope.indeterminate"
              :disabled="scope.disabled"
              :toggle-expand="scope.toggleExpand"
              :toggle-select="scope.toggleSelect"
              :find-node="scope.findNode as (value: string | number) => T | undefined"
              :find-parent="scope.findParent as (value: string | number) => T | null"
              :remove-node="scope.removeNode"
            >
              <span
                v-if="scope.node.children && scope.node.children.length > 0"
                :class="chevronPart.class"
                :style="chevronPart.style"
                aria-hidden="true"
                :data-state="scope.expanded ? 'open' : 'closed'"
                @click="scope.toggleExpand"
              >
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span v-else class="ui-tree-chevron-spacer" aria-hidden="true" />
              <!-- The row is the tab stop and Space checks it, so the box stays out of the tab order. -->
              <Checkbox
                v-if="selectionMode === 'checkbox'"
                :ref="leaveTabOrder"
                class="ui-tree-checkbox"
                :model-value="scope.checked"
                :indeterminate="scope.indeterminate"
                :disabled="scope.disabled"
                size="sm"
                :aria-label="scope.node.label"
                @update:model-value="scope.toggleSelect"
              />
              <span :class="labelPart.class" :style="labelPart.style">{{ scope.node.label }}</span>
              <svg
                v-if="selectionMode === 'single' && scope.checked"
                class="ui-tree-check ui-tick"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8.5l3 3 6-7"
                  pathLength="1"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </slot>
          </template>
        </TreeNodeRow>
      </div>
    </div>
    <!-- Always mounted: a live region created on demand isn't reliably read out.
         Outside role="tree", which may only hold tree items. -->
    <span v-if="reorderable" class="ui-tree-status" role="status" aria-live="assertive">{{
      reorderAnnouncement
    }}</span>
  </div>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'
import type { UiPartStyle } from '../../classes'

export interface TreeNode {
  label: string
  value: string | number
  children?: readonly TreeNode[]
  disabled?: boolean
}

export type TreeSelectionMode = 'single' | 'multiple' | 'checkbox'

// Depth-first search, exported so a consumer editing `items` directly
// (Tree owns no copy of it — see the SFC comment below) doesn't need to
// hand-roll the same recursion every time. Also bound per-instance onto the
// #node slot (findNode/findParent/removeNode) as a same-tree shorthand.
export function findTreeNode<T extends TreeNode>(
  nodes: readonly T[],
  value: string | number,
): T | undefined {
  for (const node of nodes) {
    if (node.value === value) return node
    if (node.children) {
      const found = findTreeNode(node.children as readonly T[], value)
      if (found) return found
    }
  }
  return undefined
}
export function findTreeParent<T extends TreeNode>(
  nodes: readonly T[],
  value: string | number,
): T | null {
  for (const node of nodes) {
    if (node.children?.some((child) => child.value === value)) return node
    if (node.children) {
      const found = findTreeParent(node.children as readonly T[], value)
      if (found) return found
    }
  }
  return null
}
/** Removes the node with `value` from `nodes` (and nested `children` arrays) in place, following the
 * same "Tree owns no copy" contract as adding and renaming. Returns whether it removed a match. */
export function removeTreeNode<T extends TreeNode>(nodes: T[], value: string | number): boolean {
  const index = nodes.findIndex((node) => node.value === value)
  if (index !== -1) {
    nodes.splice(index, 1)
    return true
  }
  return nodes.some((node) => node.children && removeTreeNode(node.children as T[], value))
}

// Non-setup block so TreeNodeRow.vue (a sibling .vue file) can import this
// without a separate .ts module — generate-vapor.mjs's dependency walker
// only follows .vue-extension sibling imports.
export interface TreeRowContext {
  selectionMode: TreeSelectionMode
  motion: boolean
  /** motion, but off for the update a search or an arrow key causes, and on very large trees. */
  rowMotion: boolean
  /** Runs every folder's fold in this tree (useFold). */
  fold: FoldScheduler
  /** The spring folders open on: the tree's `motion`, then the app's style. */
  foldSpring: FoldSpring
  stickyScroll: boolean
  maxStickyDepth: number
  isExpanded: (node: TreeNode) => boolean
  isCheckedNode: (node: TreeNode) => boolean
  isIndeterminateNode: (node: TreeNode) => boolean
  toggleExpand: (node: TreeNode) => void
  activateNode: (node: TreeNode) => void
  onRowClick: (node: TreeNode, event: MouseEvent) => void
  isVisible: (node: TreeNode) => boolean
  nodePart: (node: TreeNode, selected: boolean) => { class: string; style: UiPartStyle | undefined }
  findNode: (value: string | number) => TreeNode | undefined
  findParent: (value: string | number) => TreeNode | null
  removeNode: (value: string | number) => boolean
  forceMount: boolean
  reorderable: boolean
  dragValue: string | number | null
  /** Whole dragged block: a folder hides its descendants with it. */
  draggedValues: ReadonlySet<string | number>
  dropIntoValue: string | number | null
  /** Which row the insertion line sits on, and which side of it. */
  dropEdge: { value: string | number | null; side: 'before' | 'after' } | null
  onRowPointerdown?: (node: TreeNode, event: PointerEvent) => void
}
export const treeRowContextKey: InjectionKey<TreeRowContext> = Symbol('treeRowContext')
</script>

<!-- Tree extracts logic for standalone or nested use; TreeSelect wraps it in popover.
     Independent DOM class set (ui-tree-*); TreeSelect passes ui overrides for legacy passenger classes (ui-tree-select-*).
     Focus delegation: focusFirstRow/initRoving exposed; roving tabindex internal; focus stealing is popover-specific (TreeSelect only).
     Animation: motion=false disables all built-in motion via data-motion="off" on root. Rows render as a
     recursive TreeNodeRow tree (not a flat list) so stickyScroll can use native `position: sticky`; a
     folder folds open and shut by its rows block's height (useFold), so everything below follows in layout. -->
<script setup lang="ts" generic="T extends TreeNode = TreeNode">
import './Tree.css'
import '../shared/tick.css'
import { defaultsKey, withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import {
  computed,
  effectScope,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  shallowRef,
  unref,
  useAttrs,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import type { MaybeRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import { springOf } from '../../motion/springNames'
import type { TreeMotion } from '../../motion/types'
import Input from '../Input/Input.vue'
import Checkbox from '../Checkbox/Checkbox.vue'
import TreeNodeRow from './TreeNodeRow.vue'
import { useMessages, sortableMessages } from '../../messages'
import { normalizeText } from '../../composables/normalizeText'
import { useHoverIndicator } from '../../composables/useHoverIndicator'
import '../shared/indicator.css'
import { useEasedHeight } from '../../composables/useEasedHeight'
import { createFoldScheduler } from '../../composables/useFold'
import { loadVirtualTree, loadedVirtualTree } from '../../composables/lazyVirtualTree'
import type { useVirtualTree } from '../../composables/useVirtualTree'
import { useEventListener } from '@vueuse/core'
import { inlineKey, prefersReducedMotion } from '../../composables/dom'
import { vScrollMask } from '../../directives/vScrollMask'
import type { FoldScheduler, FoldSpring } from '../../composables/useFold'
import { DEFAULT_FOLD_SPRING } from '../../composables/useFold'
import { useMotionStyle } from '../../motion/context'
import { timingOf } from '../../composables/tourGlide'
import type { Spring } from '../../motion/types'
import { moveTreeNode } from '../../composables/sortableTree'
import { useLazySortable } from '../../composables/useLazySortable'
import type {
  DropPosition,
  FlatSortableRow,
  SortableDropDetails,
} from '../../composables/useSortable'

defineOptions({ inheritAttrs: false })

/**
 * Selected value: one value in `'single'` mode, an array in `'multiple'`, leaf values in `'checkbox'`.
 * @default null
 */
const model = defineModel<string | number | (string | number)[] | null>({ default: null })
/** Filter box text. @default '' */
const query = defineModel<string>('query', { default: '' })

const rawProps = withDefaults(
  defineProps<{
    /** Tree data: `TreeNode` objects (`value`, `label`, optional `children`) or your own extension of them. */
    items: readonly T[]
    /**
     * `'single'`: a click replaces the selection. `'multiple'`: a click toggles that node only. `'checkbox'`: checkboxes with cascading parent/child toggles.
     * @default 'single'
     */
    selectionMode?: TreeSelectionMode
    /** `false` makes folders unselectable, so only leaves can become the value. No effect in
     * `selectionMode="checkbox"`, which only puts leaves in the model.
     * @default true
     */
    selectableFolders?: boolean
    /**
     * Shows a built-in label search box above the tree and expands the ancestors of any match.
     * @default true
     */
    filterable?: boolean
    /** Placeholder and accessible label for the filter box. @default 'Search...' */
    filterPlaceholder?: string
    /**
     * Text shown when no rows are visible (empty `items` or no filter matches).
     * @default 'No results found'
     */
    emptyText?: string
    /**
     * How it moves: its appearance, row by row (`{ initial: { node: { opacity: 0, x: -4 } }, stagger: 0.03 }`),
     * over `list`, `node`, `chevron` and `label`. `false` skips all built-in motion (row
     * transitions, chevron rotation, cross-folder moves and the list easing to its new height as
     * you search).
     * @default true
     */
    motion?: TreeMotion
    /** Keeps collapsed folders' children mounted (`v-show` plus `data-state`) so you can animate
     * expand/collapse yourself instead of using the built-in transition.
     * @default false
     */
    forceMount?: boolean
    /**
     * Lets you drag rows to reorder and nest them, VS Code style. Drop on a row's middle to move into it, or on an edge to place beside it.
     * @default false
     */
    reorderable?: boolean
    /** Which rows accept dropped children. Unset, any row that already has children does; pass your own to let empty folders take drops. */
    canNestInto?: (node: T) => boolean
    /** `false` turns off sibling reordering, so dragging only moves rows into a folder. Rows that
     * can't hold children show no indicator.
     * @default true
     */
    reorderSiblings?: boolean
    /** Structural check that runs as you drag; returning `false` marks the target invalid. */
    canDrop?: (details: SortableDropDetails) => boolean
    /** Async check at drop time; return `false` (or a promise of it) to cancel. Works with `confirmAction().result`. */
    beforeDrop?: (details: SortableDropDetails) => boolean | Promise<boolean>
    /** How long, in ms, you hover a collapsed row mid-drag before it opens. @default 600 */
    autoExpandDelay?: number
    /** Drag preview: `'clone'` shows a floating copy while the real row hides until drop;
     * `'element'` moves the real row itself.
     * @default 'clone'
     */
    previewMode?: 'element' | 'clone'
    /** How long, in ms, a touch pointer must hold a row still before a drag starts. The hold tells a
     * drag apart from a tap to select or expand. Mouse and pen are unaffected.
     * @default 150
     */
    touchDragDelay?: number
    /** Clicking anywhere on a folder row toggles it, as well as the chevron. The click still
     * selects the folder unless `selectableFolders` is `false`.
     * @default false
     */
    expandOnRowClick?: boolean
    /** Pins each expanded ancestor row to the top of the list while its children scroll past,
     * VS Code-style.
     * @default false
     */
    stickyScroll?: boolean
    /**
     * Fades the list's top and bottom edges while there are more rows past them. With
     * `stickyScroll`, only the bottom fades, so pinned rows stay solid.
     * @default true
     */
    scrollFade?: boolean
    /** Id for the `role="tree"` list element. Auto-generated when omitted. */
    id?: string
    /** Class and style overrides for each part. */
    ui?: Partial<{
      list: UiPartValue
      node: UiPartValue
      filter: UiPartValue
      empty: UiPartValue
      chevron: UiPartValue
      label: UiPartValue
      /** The search icon at the start of the filter box. */
      filterIcon: UiPartValue
    }>
  }>(),
  {
    selectionMode: 'single',
    selectableFolders: true,
    filterable: true,
    filterPlaceholder: 'Search...',
    emptyText: 'No results found',
    motion: undefined,
    forceMount: false,
    reorderable: false,
    canNestInto: undefined,
    reorderSiblings: true,
    canDrop: undefined,
    beforeDrop: undefined,
    previewMode: 'clone',
    touchDragDelay: 150,
    autoExpandDelay: 600,
    expandOnRowClick: false,
    stickyScroll: false,
    scrollFade: true,
    id: undefined,
    ui: undefined,
  },
)
const props = withProviderDefaults(rawProps, { motion: true })

const attrs = useAttrs()
// Your name and description go on the `role="tree"` element; the rest stays on the root.
const isTreeAttr = (key: string) =>
  key === 'aria-label' || key === 'aria-labelledby' || key === 'aria-describedby'
const treeAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => isTreeAttr(key))),
)
const rootAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !isTreeAttr(key))),
)
function leaveTabOrder(checkbox: unknown) {
  const input = unref((checkbox as { inputEl?: MaybeRef<HTMLInputElement | null> } | null)?.inputEl)
  if (input) input.tabIndex = -1
}

const emit = defineEmits<{
  /** Fires when you change the selection, with the new model value. */
  change: [value: string | number | (string | number)[] | null]
  /** Fires when you select or toggle a node. */
  select: [node: T]
  /** Fires when a single node expands or collapses. Filter auto-expansion, `expandAll` and `collapseAll` don't fire it. */
  'expand-change': [value: string | number, expanded: boolean]
  /** Fires after `items` has been reordered in place. */
  reorder: [value: string | number, to: DropPosition]
  /** Fires when `beforeDrop` throws or rejects, after the move is reverted. */
  'drop-error': [error: unknown, details: SortableDropDetails]
}>()

defineSlots<{
  /** Row content inside the `role="treeitem"` wrapper. `findNode`/`findParent`/`removeNode` are
   * `findTreeNode`/`findTreeParent`/`removeTreeNode` bound to this tree's `items`. Read reactive
   * state here; plain variables won't update the rows. */
  node(props: {
    node: T
    depth: number
    expanded: boolean
    checked: boolean
    indeterminate: boolean
    disabled: boolean
    toggleExpand: () => void
    toggleSelect: () => void
    findNode: (value: string | number) => T | undefined
    findParent: (value: string | number) => T | null
    removeNode: (value: string | number) => boolean
  }): unknown
  /** Replaces the empty-state row shown when no rows are visible. */
  empty(): unknown
}>()

// Model holds only leaf values; parent checked/indeterminate is derived.
interface NodeCheckState {
  checked: boolean
  indeterminate: boolean
}
const checkedValueSet = computed(() => new Set(Array.isArray(model.value) ? model.value : []))
const stateByValue = computed(() => {
  const map = new Map<string | number, NodeCheckState>()
  function visit(node: TreeNode): NodeCheckState {
    let state: NodeCheckState
    if (!node.children || node.children.length === 0) {
      state = { checked: checkedValueSet.value.has(node.value), indeterminate: false }
    } else {
      // Disabled children excluded from parent aggregate.
      const participants = node.children.filter((child) => !child.disabled)
      const relevant = participants.length > 0 ? participants : node.children
      let checkedCount = 0
      let touchedCount = 0
      for (const child of relevant) {
        const childState = visit(child)
        if (childState.checked) checkedCount++
        if (childState.checked || childState.indeterminate) touchedCount++
      }
      if (checkedCount === relevant.length) state = { checked: true, indeterminate: false }
      else if (touchedCount > 0) state = { checked: false, indeterminate: true }
      else state = { checked: false, indeterminate: false }
    }
    map.set(node.value, state)
    return state
  }
  if (props.selectionMode === 'checkbox') for (const node of props.items) visit(node)
  return map
})

// Called once per row on every selection change, so lookups stay O(1).
function isCheckedNode(node: TreeNode): boolean {
  if (props.selectionMode === 'single') return model.value === node.value
  if (props.selectionMode === 'multiple') return checkedValueSet.value.has(node.value)
  return stateByValue.value.get(node.value)?.checked ?? false
}
function isIndeterminateNode(node: TreeNode): boolean {
  if (props.selectionMode !== 'checkbox') return false
  return stateByValue.value.get(node.value)?.indeterminate ?? false
}

function collectLeaves(node: TreeNode, out: TreeNode[]) {
  if (!node.children || node.children.length === 0) {
    out.push(node)
    return
  }
  for (const child of node.children) collectLeaves(child, out)
}
function toggleCheckbox(node: TreeNode) {
  const turningOn = !stateByValue.value.get(node.value)?.checked
  const leaves: TreeNode[] = []
  collectLeaves(node, leaves)
  const next = new Set(checkedValueSet.value)
  for (const leaf of leaves) {
    if (leaf.disabled) continue
    if (turningOn) next.add(leaf.value)
    else next.delete(leaf.value)
  }
  const arr = Array.from(next)
  model.value = arr
  emit('change', arr)
  emit('select', node as T)
}
function toggleMultiple(node: TreeNode) {
  const current = Array.isArray(model.value) ? [...model.value] : []
  const index = current.indexOf(node.value)
  if (index === -1) current.push(node.value)
  else current.splice(index, 1)
  model.value = current
  emit('change', current)
  emit('select', node as T)
}
function selectSingle(node: TreeNode) {
  model.value = node.value
  emit('change', node.value)
  emit('select', node as T)
}
function activateNode(node: TreeNode) {
  if (node.disabled) return
  if (props.selectionMode === 'checkbox') {
    // Checkbox mode never puts a folder's own value in the model — it
    // collects leaves — so selectableFolders doesn't apply here.
    toggleCheckbox(node)
    return
  }
  const hasChildren = !!node.children && node.children.length > 0
  if (!props.selectableFolders && hasChildren) return
  if (props.selectionMode === 'multiple') toggleMultiple(node)
  else selectSingle(node)
}

const expandedKeys = ref(new Set<string | number>())
const normalizedQuery = computed(() => normalizeText(query.value.trim()))
const isFiltering = computed(() => normalizedQuery.value.length > 0)
// A search opens and closes many folders at once, so their rows swap instead of animating (the
// list's height still eases); folder animations come back for the next click. Arrow keys swap at
// once too: someone arrowing through a tree shouldn't wait on motion.
const instantSwap = shallowRef(false)
watch(
  normalizedQuery,
  () => {
    instantSwap.value = true
    nextTick(() => (instantSwap.value = false))
  },
  { flush: 'pre' },
)
function nodeMatches(node: TreeNode): boolean {
  return normalizeText(node.label).includes(normalizedQuery.value)
}
// Nodes matching or with matching descendants.
const subtreeMatchSet = computed(() => {
  const set = new Set<string | number>()
  function visit(node: TreeNode): boolean {
    let matched = nodeMatches(node)
    if (node.children) {
      for (const child of node.children) {
        if (visit(child)) matched = true
      }
    }
    if (matched) set.add(node.value)
    return matched
  }
  if (isFiltering.value) for (const node of props.items) visit(node)
  return set
})

function isExpanded(node: TreeNode): boolean {
  // While filtering: force-show all surviving branches; manual state resumes after query clears
  if (isFiltering.value) return subtreeMatchSet.value.has(node.value)
  return expandedKeys.value.has(node.value)
}
function toggleExpand(node: TreeNode) {
  if (!node.children || node.children.length === 0) return
  const next = new Set(expandedKeys.value)
  const nowExpanded = !next.has(node.value)
  if (nowExpanded) next.add(node.value)
  else next.delete(node.value)
  expandedKeys.value = next
  emit('expand-change', node.value, nowExpanded)
}
function toggleExpandInstantly(node: TreeNode) {
  instantSwap.value = true
  toggleExpand(node)
  nextTick(() => (instantSwap.value = false))
}
function setExpanded(value: string | number, expanded: boolean) {
  if (expandedKeys.value.has(value) === expanded) return
  const next = new Set(expandedKeys.value)
  if (expanded) next.add(value)
  else next.delete(value)
  expandedKeys.value = next
  emit('expand-change', value, expanded)
}
/** Expands a single node by value, e.g. after programmatically creating a child inside it. No-op if
 * already expanded or the node has no children. */
function expandNode(value: string | number) {
  setExpanded(value, true)
}
/** Collapses a single node by value. No-op if already collapsed. */
function collapseNode(value: string | number) {
  setExpanded(value, false)
}
function expandAll() {
  const next = new Set<string | number>()
  function visit(nodes: readonly TreeNode[]) {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        next.add(node.value)
        visit(node.children)
      }
    }
  }
  visit(props.items)
  expandedKeys.value = next
}
function collapseAll() {
  expandedKeys.value = new Set()
}

function isVisible(node: TreeNode): boolean {
  return !isFiltering.value || subtreeMatchSet.value.has(node.value)
}
const visibleRootNodes = computed(() => props.items.filter(isVisible))

// Roving tabindex + keyboard nav (own copy due to tree semantics).
const listEl = useTemplateRef<HTMLElement>('listEl')
// Single selection: the new row's highlight slides in from where the last one was, or fades in
// when that's more than a few rows away. CSS owns the motion; this only measures the distance.
let highlightFrom: number | null = null
const highlightEl = () =>
  listEl.value?.querySelector<HTMLElement>('[role="treeitem"] > .ui-tree-row-highlight') ?? null
watch(
  model,
  () => {
    if (props.selectionMode === 'single')
      highlightFrom = highlightEl()?.getBoundingClientRect().top ?? null
  },
  { flush: 'pre' },
)
watch(
  model,
  () => {
    const from = highlightFrom
    highlightFrom = null
    const el = highlightEl()
    if (from === null || !el) return
    const { top, height } = el.getBoundingClientRect()
    if (Math.abs(from - top) < 0.5) return
    el.style.setProperty('--ui-tree-highlight-from', `${from - top}px`)
    el.dataset.from = Math.abs(from - top) > height * 4 ? 'far' : 'near'
  },
  { flush: 'post' },
)
// Searching eases the list to its new height, the same as Select's and Combobox's lists. TreeSelect
// gets it from here.
useEasedHeight({
  el: () => listEl.value,
  source: [normalizedQuery, () => props.items],
  enabled: () => props.motion !== false,
})
function rowEls(): HTMLElement[] {
  return Array.from(listEl.value?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])
}
// The tabbable row, by value: a large tree re-renders rows as it scrolls and puts it back.
let rovingValue: string | undefined
function setRoving(target: HTMLElement | undefined) {
  rovingValue = target?.dataset.treeValue
  for (const el of rowEls()) el.tabIndex = el === target ? 0 : -1
}
function focusRow(el: HTMLElement | undefined) {
  if (!el) return
  setRoving(el)
  // A large tree has already scrolled the row into view, clear of its pinned rows.
  el.focus({ preventScroll: virtual.value })
}
// Focuses a row by value; in a large tree, scrolls it into view (and so renders it) first.
function focusValue(value: string | number) {
  if (virtual.value) {
    const index = virtualTree.value!.indexOf(value)
    if (index === -1) return
    virtualTree.value!.scrollToIndex(index)
    const el = treeRowElement(value)
    if (el) focusRow(el)
    else void nextTick(() => focusRow(treeRowElement(value) ?? undefined))
    return
  }
  focusRow(treeRowElement(value) ?? undefined)
}
function focusAt(index: number) {
  const row = flatRows.value[index]
  if (row) focusValue(row.node.value)
}
function focusFirstRow() {
  focusAt(0)
}
// The tab stop starts on the first selected row, else the first row (APG tree view).
function initRoving() {
  const rows = rowEls()
  setRoving(
    rows.find(
      (el) =>
        el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true',
    ) ?? rows[0],
  )
}
// Opens the folders above the row, then focuses it.
function focusNode(value: string | number) {
  instantSwap.value = true
  for (let parent = findParent(value); parent; parent = findParent(parent.value))
    setExpanded(parent.value, true)
  void nextTick(() => {
    instantSwap.value = false
    focusValue(value)
  })
}

// Depth-first flatten of currently VISIBLE rows, used only for keyboard-nav
// index math (ArrowUp/Down/Left/Right, Home/End) — rendering itself goes
// through TreeNodeRow's own recursion, not this list.
interface FlatNode {
  node: TreeNode
  depth: number
  parentValue: string | number | null
  hasChildren: boolean
}
function flatten(
  nodes: readonly TreeNode[],
  depth: number,
  parentValue: string | number | null,
  out: FlatNode[],
) {
  for (const node of nodes) {
    if (!isVisible(node)) continue
    const hasChildren = !!node.children && node.children.length > 0
    out.push({ node, depth, parentValue, hasChildren })
    if (hasChildren && isExpanded(node)) {
      flatten(node.children!, depth + 1, node.value, out)
    }
  }
}
const flatRows = computed<FlatNode[]>(() => {
  const out: FlatNode[] = []
  flatten(props.items, 0, null, out)
  return out
})

// --- reorder -----------------------------------------------------------------
// Runs on the same engine as Sortable, so a Tree drop and a list drop resolve
// and commit through identical code.
function treeRowElement(value: string | number): HTMLElement | null {
  return (
    listEl.value?.querySelector<HTMLElement>(`[data-tree-value="${CSS.escape(String(value))}"]`) ??
    null
  )
}
const messages = useMessages({ sortable: sortableMessages })
const sortableRows = computed<FlatSortableRow[]>(() =>
  flatRows.value.map((row) => ({
    value: row.node.value,
    depth: row.depth,
    parentValue: row.parentValue,
  })),
)
const {
  activeValue: dragValue,
  isGrabbed: isReordering,
  draggedValues,
  dropIntoValue,
  dropTargetValue,
  dropIntent,
  isValidDrop,
  isPending: isDropPending,
  announcement: reorderAnnouncement,
  onHandlePointerdown: onSortablePointerdown,
  onHandleKeydown: onSortableKeydown,
  consumeSuppressedClick,
  cancel: cancelReorder,
} = useLazySortable(
  {
    rows: sortableRows,
    getElement: treeRowElement,
    nested: true,
    dropOnTarget: true,
    dragPreview: true,
    previewMode: () => props.previewMode,
    touchDragDelay: () => props.touchDragDelay,
    disabled: () => !props.reorderable,
    reorderSiblings: () => props.reorderSiblings,
    motion: () => props.motion !== false,
    autoExpandDelay: () => props.autoExpandDelay,
    onAutoExpand: (value) => expandNode(value),
    canNestInto: (value) => {
      const node = findNode(value)
      if (!node) return false
      return props.canNestInto ? props.canNestInto(node as T) : !!node.children
    },
    childCountOf: (value) => findNode(value)?.children?.length ?? 0,
    canDrop: (details) => props.canDrop?.(details) ?? true,
    beforeDrop: props.beforeDrop ? (details) => props.beforeDrop!(details) : undefined,
    onDropError: (error, details) => emit('drop-error', error, details),
    labelOf: (value) => findNode(value)?.label ?? String(value),
    announce: (event) =>
      messages.value.sortable[
        event.kind === 'grab'
          ? 'grabbed'
          : event.kind === 'move'
            ? 'movedToLevel'
            : event.kind === 'drop'
              ? 'dropped'
              : 'cancelled'
      ]
        .replace('{label}', event.label)
        .replace('{position}', String(event.position))
        .replace('{total}', String(event.total))
        .replace('{depth}', String(event.depth + 1)),
    onCommit: (value, to) => {
      // Same shared function Sortable commits through.
      if (!moveTreeNode(props.items as T[], value, to)) return
      emit('reorder', value, to)
    },
  },
  () => props.reorderable,
)

// The hover and keyboard highlight slides between rows; not while a row is being dragged.
const hoverEl = useTemplateRef<HTMLElement>('hoverEl')
const { style: hoverStyle } = useHoverIndicator(listEl, {
  itemSelector: '.ui-tree-row',
  scope: '[role="tree"]',
  scroller: true,
  enabled: () => !isReordering.value,
  motion: () => props.motion !== false,
  indicatorEl: hoverEl,
  // Trees stacked as sections (an explorer's) share one highlight.
  group: 'tree',
})

const parts = useStateMotion({
  key: 'tree',
  mainPart: 'list',
  motion: () => props.motion,
  root: () => listEl.value,
  selectors: {
    list: '.ui-tree-list',
    node: '.ui-tree-row',
    chevron: '.ui-tree-chevron',
    label: '.ui-tree-label',
  },
  states: () => ({}),
})

function onRowPointerdown(node: TreeNode, event: PointerEvent) {
  if (!props.reorderable || node.disabled) return
  onSortablePointerdown(event, node.value)
}

function onTreeKeydown(event: KeyboardEvent) {
  // While an item is held, arrows move it instead of moving focus.
  if (isReordering.value) {
    const held = dragValue.value
    if (held != null) {
      onSortableKeydown(event, held)
      return
    }
  }
  if (props.reorderable && (event.key === ' ' || event.key === 'Enter')) {
    const active =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.closest<HTMLElement>('[data-tree-value]')
        : null
    const value = active?.dataset.treeValue
    // Only claim Space when it would start a reorder; Enter still selects.
    if (value != null && event.key === ' ') {
      const node = flatRows.value.find((r) => String(r.node.value) === value)?.node
      if (node && !node.disabled) {
        onSortableKeydown(event, node.value)
        return
      }
    }
  }
  onTreeNavigationKeydown(event)
}

// Every visible row's place in the list, by value: keys move by position in the whole tree, not
// among the rows a large tree happens to have rendered.
const rowIndexByValue = computed(() => {
  const map = new Map<string, number>()
  flatRows.value.forEach((row, index) => map.set(String(row.node.value), index))
  return map
})

function onTreeNavigationKeydown(event: KeyboardEvent) {
  const rows = flatRows.value
  if (rows.length === 0) return
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  // Guard: resolve to owning row whether focus is on row div or nested input.
  const activeRow = active?.closest<HTMLElement>('[role="treeitem"]') ?? null
  const currentIndex = activeRow
    ? (rowIndexByValue.value.get(activeRow.dataset.treeValue ?? '') ?? -1)
    : -1

  switch (inlineKey(event.key, event.currentTarget as Element)) {
    case 'ArrowDown':
      event.preventDefault()
      focusAt(Math.min(currentIndex + 1, rows.length - 1))
      return
    case 'ArrowUp':
      event.preventDefault()
      focusAt(currentIndex <= 0 ? 0 : currentIndex - 1)
      return
    case 'Home':
      event.preventDefault()
      focusAt(0)
      return
    case 'End':
      event.preventDefault()
      focusAt(rows.length - 1)
      return
    case 'ArrowRight': {
      if (currentIndex === -1) return
      const row = flatRows.value[currentIndex]
      if (!row || !row.hasChildren) return
      event.preventDefault()
      // ARIA APG: closed opens (focus stays); open moves to first child.
      if (!isExpanded(row.node)) toggleExpandInstantly(row.node)
      else focusAt(currentIndex + 1)
      return
    }
    case 'ArrowLeft': {
      if (currentIndex === -1) return
      const row = flatRows.value[currentIndex]
      if (!row) return
      event.preventDefault()
      if (row.hasChildren && isExpanded(row.node)) {
        toggleExpandInstantly(row.node)
      } else if (row.parentValue != null) {
        focusValue(row.parentValue)
      }
      return
    }
    case 'Enter':
    case ' ':
      if (currentIndex === -1) return
      // Only row div here; checkbox input has native Enter/Space handling.
      if (active === activeRow) {
        event.preventDefault()
        const row = flatRows.value[currentIndex]
        if (row) activateNode(row.node)
      }
      return
    default:
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTextEntry(event.target) &&
        typeahead(event.key, activeRow)
      )
        event.preventDefault()
      return
  }
}

// Typeahead (WAI-ARIA tree pattern), same buffer and reset as useListbox.
const TYPEAHEAD_RESET_MS = 500
let typeaheadBuffer = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(typeaheadTimer))
// A rename input or other field inside the #node slot keeps its keystrokes.
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLSelectElement) return true
  return (
    target instanceof HTMLInputElement && !['checkbox', 'radio', 'button'].includes(target.type)
  )
}
function typeahead(key: string, activeRow: HTMLElement | null): boolean {
  typeaheadBuffer += normalizeText(key)
  clearTimeout(typeaheadTimer)
  typeaheadTimer = setTimeout(() => {
    typeaheadBuffer = ''
  }, TYPEAHEAD_RESET_MS)

  const rows = flatRows.value
  const current = activeRow
    ? rows.findIndex((row) => String(row.node.value) === activeRow.dataset.treeValue)
    : -1
  // A repeated character cycles through matches; a longer string refines the current one.
  const repeated = Array.from(typeaheadBuffer).every((char) => char === typeaheadBuffer[0])
  const search = repeated ? typeaheadBuffer[0] : typeaheadBuffer
  const start = repeated ? current + 1 : Math.max(current, 0)
  for (let offset = 0; offset < rows.length; offset++) {
    const row = rows[(start + offset) % rows.length]
    if (normalizeText(row.node.label.trim()).startsWith(search)) {
      focusValue(row.node.value)
      return true
    }
  }
  return false
}

function onRowClick(node: TreeNode, event: MouseEvent) {
  if (node.disabled) return
  // The browser fires a trailing click after a drag. Without this, dropping a
  // row also expands or selects it — the drag and the click both "happen".
  if (consumeSuppressedClick()) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  const target = event.target as HTMLElement
  // Guard: chevron/checkbox click must not also activate row.
  if (target.closest('.ui-tree-chevron, .ui-checkbox')) return
  const hasChildren = !!node.children && node.children.length > 0
  if (props.expandOnRowClick && hasChildren) toggleExpand(node)
  activateNode(node)
}

// Keep one row tabbable; reseed when row leaves DOM.
watch(flatRows, () => {
  nextTick(() => {
    const rows = rowEls()
    if (rows.length === 0) return
    if (!rows.some((el) => el.tabIndex === 0)) setRoving(rows[0])
  })
})
// Self-initializing: first row tabbable on mount.
onMounted(() => initRoving())

// Above this many rendered rows a folder opens and closes at once: re-laying out that many rows
// every frame would cost more than the motion is worth. Measured with checkboxes and sticky rows on a
// CPU slowed 4x: 500 rows fold at full frame rate, 1,000 drop a third of their frames.
const FOLD_MAX_ROWS = 500
// Above this many, checkboxes are static (no press, no layer each): that limit is memory, not time.
// A large tree's flat list renders only the rows in view, so its checkboxes keep their press.
const STATIC_CONTROLS_ROWS = 150
// Past FOLD_MAX_ROWS a tree becomes a flat list that renders only what's in view, so its folders
// fold at any size; it goes back below this, so a tree near the line doesn't switch on every click.
// A reorderable tree and forceMount keep the nested rows.
const MAX_STICKY_DEPTH = 5
const VIRTUAL_EXIT_ROWS = 400
const wantsVirtual = computed<boolean>((was) => {
  if (props.reorderable || props.forceMount) return false
  const count = flatRows.value.length
  return was ? count >= VIRTUAL_EXIT_ROWS : count > FOLD_MAX_ROWS
})
type VirtualTreeApi = ReturnType<typeof useVirtualTree<DisplayRow>>
// Loaded with the first tree past the line; until it arrives the rows stay nested, as they were.
const virtualTree = shallowRef<VirtualTreeApi | null>(null)
const virtual = computed(() => wantsVirtual.value && virtualTree.value !== null)
// Past the line before the flat list has loaded: the first screenful, where the list will put it,
// instead of mounting every row as nested ones.
const loadingFlat = computed(() => wantsVirtual.value && virtualTree.value === null)
const LOADING_ROWS = 60
// Where the list will put them: from the row at the current scroll position, with the rows above
// and below kept as room, so the scrollbar and the place you were stay put.
const LOADING_PITCH = 33
const loadingStart = shallowRef(0)
watch(loadingFlat, (on) => {
  if (on) loadingStart.value = Math.floor((listEl.value?.scrollTop ?? 0) / LOADING_PITCH)
})
const loadingEntries = computed<RenderEntry[]>(() => {
  const rows = flatRows.value
  const start = Math.max(0, Math.min(loadingStart.value, rows.length - LOADING_ROWS))
  return rows.slice(start, start + LOADING_ROWS).map((row) => ({
    key: String(row.node.value),
    node: row.node,
    depth: row.depth,
  }))
})
const loadingRoom = computed(() => {
  const start = Math.max(0, Math.min(loadingStart.value, flatRows.value.length - LOADING_ROWS))
  const after = Math.max(0, flatRows.value.length - start - LOADING_ROWS)
  return {
    paddingBlockStart: `${start * LOADING_PITCH}px`,
    paddingBlockEnd: `${after * LOADING_PITCH}px`,
  }
})
// A tree whose nodes could add up past the line fetches the flat list while the browser is idle,
// so expanding it later doesn't wait on the network.
const nodeCount = computed(() => {
  let count = 0
  const visit = (nodes: readonly TreeNode[]) => {
    for (const node of nodes) {
      count++
      if (node.children) visit(node.children)
    }
  }
  visit(props.items)
  return count
})
onMounted(() => {
  watch(
    nodeCount,
    (count) => {
      if (count <= FOLD_MAX_ROWS || props.reorderable || props.forceMount) return
      const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 200))
      idle(() => void loadVirtualTree())
    },
    { immediate: true },
  )
})
// A folder folding shut in the flat list keeps its rows until it has.
const closingKeys = shallowRef(new Set<string | number>())
interface DisplayRow extends FlatNode {
  value: string | number
  setSize: number
  posInSet: number
}
function flattenDisplay(
  nodes: readonly TreeNode[],
  depth: number,
  parentValue: string | number | null,
  out: DisplayRow[],
) {
  const shown = nodes.filter(isVisible)
  shown.forEach((node, index) => {
    const hasChildren = !!node.children && node.children.length > 0
    out.push({
      node,
      value: node.value,
      depth,
      parentValue,
      hasChildren,
      setSize: shown.length,
      posInSet: index + 1,
    })
    if (hasChildren && (isExpanded(node) || closingKeys.value.has(node.value)))
      flattenDisplay(node.children!, depth + 1, node.value, out)
  })
}
const displayRows = computed<DisplayRow[]>(() => {
  if (!virtual.value) return []
  const out: DisplayRow[] = []
  flattenDisplay(props.items, 0, null, out)
  return out
})
// Folders follow the motion system's timing the way every component's own motion does: this tree's
// `motion`, then the style's `tree` key, then the app's spring (a provider's `{ spring }` or its
// style's). A duration and easing become a spring at that pace without the bounce. They close at
// the same pace without the bounce too.
const motionStyle = useMotionStyle()
const providerDefaults = inject(defaultsKey, undefined)
const treeFoldSpring = computed<FoldSpring>(() => {
  const timing = timingOf(rawProps.motion) ?? timingOf(motionStyle?.value?.tree)
  if (typeof timing?.duration === 'number') return { damping: 1, response: timing.duration / 1000 }
  const spring = springOf((timing?.spring as Spring | undefined) ?? providerDefaults?.value.spring)
  return {
    damping: spring?.damping ?? DEFAULT_FOLD_SPRING.damping,
    response: spring?.response ?? DEFAULT_FOLD_SPRING.response,
  }
})
const rowsEl = useTemplateRef<HTMLElement>('rowsEl')
// The focused row stays rendered while the list scrolls, so focus isn't dropped.
const focusedValue = shallowRef<string | number | null>(null)
useEventListener(listEl, 'focusin', (event: FocusEvent) => {
  const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('[role="treeitem"]')
  const index = row ? rowIndexByValue.value.get(row.dataset.treeValue ?? '') : undefined
  focusedValue.value = index === undefined ? null : flatRows.value[index]!.node.value
})
useEventListener(listEl, 'focusout', (event: FocusEvent) => {
  if (!listEl.value?.contains(event.relatedTarget as Node | null)) focusedValue.value = null
})
// Its effects live in their own scope, stopped with the tree.
const virtualScope = effectScope()
function startVirtualTree(module: { useVirtualTree: typeof useVirtualTree }) {
  if (virtualTree.value) return
  virtualTree.value =
    virtualScope.run(() =>
      module.useVirtualTree<DisplayRow>({
        rowsEl: () => rowsEl.value,
        rows: () => displayRows.value,
        enabled: () => virtual.value,
        sticky: () => props.stickyScroll,
        maxStickyDepth: MAX_STICKY_DEPTH,
        keep: () => focusedValue.value,
        spring: () => treeFoldSpring.value,
        onClosed: (value) => {
          const next = new Set(closingKeys.value)
          next.delete(value)
          closingKeys.value = next
        },
      }),
    ) ?? null
}
watch(
  wantsVirtual,
  (on) => {
    if (!on || virtualTree.value || typeof window === 'undefined') return
    // Loaded already (another tree, or fetched while idle): switch in this same update.
    const module = loadedVirtualTree()
    if (module) startVirtualTree(module)
    else void loadVirtualTree().then(startVirtualTree)
  },
  { immediate: true },
)
// One folder opened or closed by a click folds; many at once, a search, or keys swap at once.
watch(
  expandedKeys,
  (next, previous) => {
    if (!virtual.value) return
    const opened = [...next].filter((value) => !previous.has(value))
    const closed = [...previous].filter((value) => !next.has(value))
    if (opened.some((value) => closingKeys.value.has(value))) {
      const keys = new Set(closingKeys.value)
      for (const value of opened) keys.delete(value)
      closingKeys.value = keys
    }
    const animate =
      props.motion !== false &&
      !instantSwap.value &&
      !isFiltering.value &&
      !prefersReducedMotion() &&
      opened.length + closed.length === 1
    const tree = virtualTree.value!
    if (!animate) return tree.finishAll()
    if (closed.length) {
      closingKeys.value = new Set(closingKeys.value).add(closed[0]!)
      tree.fold(closed[0]!, false)
    } else tree.fold(opened[0]!, true)
  },
  { flush: 'pre' },
)
watch(normalizedQuery, () => virtualTree.value?.finishAll())

interface RenderEntry {
  key: string
  node: TreeNode
  depth: number
  index?: number
  y?: number
  top?: number
  setSize?: number
  posInSet?: number
  style?: Record<string, string>
}
const renderEntries = computed<RenderEntry[]>(() => {
  if (loadingFlat.value) return loadingEntries.value
  if (!virtual.value)
    return visibleRootNodes.value.map((node) => ({ key: String(node.value), node, depth: 0 }))
  const tree = virtualTree.value!
  const pins = tree.pinned.value.map(({ row, top }) => ({
    key: `pin:${String(row.value)}`,
    node: row.node,
    depth: row.depth,
    top,
    style: { top: `${top}px`, zIndex: String(6 - row.depth) },
  }))
  const rows = tree.window.value.map(({ row, index, y }) => ({
    key: String(row.value),
    node: row.node,
    depth: row.depth,
    index,
    y,
    setSize: row.setSize,
    posInSet: row.posInSet,
    style: { translate: `0 calc(${y}px - var(--ui-tree-shift, 0px))` },
  }))
  return [...pins, ...rows]
})
// Rows a large tree re-renders as it scrolls come back with the tabbable one where it was.
watch(
  renderEntries,
  () => {
    if (!virtual.value) return
    const rows = rowEls()
    const keep = rows.find((el) => el.dataset.treeValue === rovingValue) ?? rows[0]
    for (const el of rows) el.tabIndex = el === keep ? 0 : -1
  },
  { flush: 'post' },
)
// Switching between nested and flat rows replaces them: the focused row gets its focus back.
let refocusValue: string | null = null
watch(
  wantsVirtual,
  () => {
    const row =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.closest<HTMLElement>('[role="treeitem"]')
        : null
    refocusValue = row && listEl.value?.contains(row) ? (row.dataset.treeValue ?? null) : null
  },
  { flush: 'pre' },
)
watch(
  virtual,
  () => {
    const value = refocusValue
    refocusValue = null
    if (value === null) return
    const row = flatRows.value[rowIndexByValue.value.get(value) ?? -1]
    if (row) focusValue(row.node.value)
  },
  { flush: 'post' },
)
// One frame loop for every folder folding in this tree (useFold), so nested folders animating
// together measure once and write once per frame.
const foldScheduler = createFoldScheduler()

const filterInputRef = useTemplateRef<{ el: HTMLElement | null; inputEl: HTMLInputElement | null }>(
  'filterInputRef',
)

const cx = useClassMerge()
const themedUi = useThemedUi<{
  list: UiPartValue
  node: UiPartValue
  filter: UiPartValue
  empty: UiPartValue
  chevron: UiPartValue
  label: UiPartValue
  filterIcon: UiPartValue
}>(
  (theme) => theme.tree,
  () => props.ui,
)

const internalId = useId()
const listId = computed(() => props.id ?? internalId)

const filterPart = computed(() => resolveUiPart(cx, themedUi()?.filter, 'ui-tree-filter'))
const listPart = computed(() => resolveUiPart(cx, themedUi()?.list, 'ui-tree-list'))
const emptyPart = computed(() => resolveUiPart(cx, themedUi()?.empty, 'ui-tree-empty'))
const chevronPart = computed(() => resolveUiPart(cx, themedUi()?.chevron, 'ui-tree-chevron'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-tree-label'))
const filterIconPart = computed(() =>
  resolveUiPart(cx, themedUi()?.filterIcon, 'ui-tree-search-icon'),
)
function nodePart(node: TreeNode, selected: boolean) {
  return resolveUiPart(
    cx,
    themedUi()?.node,
    'ui-tree-row',
    node.disabled && 'ui-tree-row--disabled',
    selected && 'ui-tree-row--selected',
  )
}

// Slot-bound shorthand for findTreeNode/findTreeParent/removeTreeNode
// against this instance's own `items`, so the #node slot doesn't need its
// own import for the common case of looking up a sibling/parent/self.
function findNode(value: string | number): T | undefined {
  return findTreeNode(props.items, value)
}
function findParent(value: string | number): T | null {
  return findTreeParent(props.items, value)
}
function removeNode(value: string | number): boolean {
  return removeTreeNode(props.items as T[], value)
}

/** Selected node object(s), resolved from `v-model` against `items`. Read-only in effect: the value
 * model overwrites any writes.
 * @default null
 */
const nodeModel = defineModel<T | T[] | null>('node', { default: null })
watch(
  [model, () => props.items],
  ([value]) => {
    nodeModel.value = Array.isArray(value)
      ? value.map((v) => findNode(v)).filter((n): n is T => n != null)
      : value == null
        ? null
        : (findNode(value) ?? null)
  },
  { immediate: true },
)

provide<TreeRowContext>(
  treeRowContextKey,
  reactive({
    selectionMode: computed(() => props.selectionMode),
    motion: computed(() => props.motion !== false),
    rowMotion: computed(
      () => props.motion !== false && !instantSwap.value && flatRows.value.length <= FOLD_MAX_ROWS,
    ),
    fold: foldScheduler,
    foldSpring: treeFoldSpring,
    stickyScroll: computed(() => props.stickyScroll),
    maxStickyDepth: MAX_STICKY_DEPTH,
    isExpanded,
    isCheckedNode,
    isIndeterminateNode,
    toggleExpand,
    activateNode,
    onRowClick,
    isVisible,
    nodePart,
    findNode,
    findParent,
    removeNode,
    forceMount: computed(() => props.forceMount),
    reorderable: computed(() => props.reorderable),
    dragValue: computed(() => dragValue.value),
    draggedValues: computed(() => draggedValues.value),
    dropIntoValue: computed(() => dropIntoValue.value),
    dropEdge: computed(() =>
      dropIntent.value === 'before' || dropIntent.value === 'after'
        ? { value: dropTargetValue.value, side: dropIntent.value }
        : null,
    ),
    onRowPointerdown,
  }),
)

defineExpose({
  /** The `role="tree"` list element. */
  listEl,
  /** The hover and keyboard highlight, sliding between rows. With `motion: false` it moves at once, for your own animation. */
  highlightEl: hoverEl,
  /** The filter box's Input instance (null when `filterable` is off). */
  filterInputRef,
  /** Focuses the first visible row. */
  focusFirstRow,
  /** Makes the first selected row, or else the first visible row, the tab stop without focusing it. */
  initRoving,
  /** Expands the folders above the row with this value and focuses it. */
  focusNode,
  /** Expands every folder. */
  expandAll,
  /** Collapses every folder. */
  collapseAll,
  /** Expands the node with this value, e.g. after adding a child to it. */
  expandNode,
  /** Collapses the node with this value. */
  collapseNode,
  /** Finds a node in `items` by value. */
  findNode,
  /** Finds a node's parent in `items` by value (null at the root). */
  findParent,
  /** Removes a node from `items` in place; returns whether one was found. */
  removeNode,
  /** `true` while a row is held, by pointer or keyboard. */
  isReordering,
  /** Aborts an in-flight reorder and springs every row back into place. */
  cancelReorder,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
