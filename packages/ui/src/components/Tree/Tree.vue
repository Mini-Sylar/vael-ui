<template>
  <div class="ui-tree-root" :data-motion="motionCss ? undefined : 'off'">
    <div v-if="filterable" :class="filterPart.class" :style="filterPart.style">
      <Input
        ref="filterInputRef"
        v-model="query"
        :placeholder="filterPlaceholder"
        size="sm"
        :aria-label="filterPlaceholder"
        @keydown.down.prevent="focusFirstRow"
      >
        <template #start>
          <svg
            class="ui-tree-search-icon"
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
      :data-reorderable="reorderable ? '' : undefined"
      :data-reordering="isReordering ? '' : undefined"
      :data-invalid-drop="isReordering && !isValidDrop ? '' : undefined"
      :data-drop-pending="isDropPending ? '' : undefined"
      :aria-multiselectable="selectionMode !== 'single' || undefined"
      :class="listPart.class"
      :style="listPart.style"
      @keydown="onTreeKeydown"
    >
      <div
        v-if="visibleRootNodes.length === 0"
        :class="emptyPart.class"
        :style="emptyPart.style"
        role="presentation"
      >
        <slot name="empty">{{ emptyText }}</slot>
      </div>
      <div v-else class="ui-tree-rows">
        <TreeNodeRow
          v-for="node in visibleRootNodes"
          :key="String(node.value)"
          :node="node"
          :depth="0"
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
              <Checkbox
                v-if="selectionMode === 'checkbox'"
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
                class="ui-tree-check"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8.5l3 3 6-7"
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
      <!-- Mounted for the life of the tree: a live region created at
           announcement time is not reliably read out. -->
      <span v-if="reorderable" class="ui-tree-status" role="status" aria-live="assertive">{{
        reorderAnnouncement
      }}</span>
    </div>
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
  motionCss: boolean
  stickyScroll: boolean
  maxStickyDepth: number
  isExpanded: (node: TreeNode) => boolean
  isCheckedNode: (node: TreeNode) => boolean
  isIndeterminateNode: (node: TreeNode) => boolean
  ariaChecked: (node: TreeNode) => 'true' | 'false' | 'mixed'
  toggleExpand: (node: TreeNode) => void
  activateNode: (node: TreeNode) => void
  onRowClick: (node: TreeNode, event: MouseEvent) => void
  isVisible: (node: TreeNode) => boolean
  nodePart: (node: TreeNode) => { class: string; style: UiPartStyle | undefined }
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
     Animation: motionCss=false disables all built-in motion via data-motion="off" on root. Rows render as a
     recursive TreeNodeRow tree (not a flat list) so stickyScroll can use native `position: sticky` — see the FLIP
     pass below for what that costs and how it's covered. -->
<script setup lang="ts" generic="T extends TreeNode = TreeNode">
import './Tree.css'
import '../shared/tokens.css'
import {
  computed,
  nextTick,
  onMounted,
  provide,
  reactive,
  ref,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import Input from '../Input/Input.vue'
import Checkbox from '../Checkbox/Checkbox.vue'
import TreeNodeRow from './TreeNodeRow.vue'
import { useUiMessages } from '../../messages'
import { normalizeText } from '../../composables/normalizeText'
import { moveTreeNode, useSortable } from '../../composables/useSortable'
import type {
  DropPosition,
  FlatSortableRow,
  SortableDropDetails,
} from '../../composables/useSortable'

/**
 * Selected value: one value in `'single'` mode, an array in `'multiple'`, leaf values in `'checkbox'`.
 * @default null
 */
const model = defineModel<string | number | (string | number)[] | null>({ default: null })
/** Filter box text. @default '' */
const query = defineModel<string>('query', { default: '' })

const props = withDefaults(
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
     * `false` skips all built-in motion (row transitions, chevron rotation and cross-folder moves).
     * @default true
     */
    motionCss?: boolean
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
    }>
  }>(),
  {
    selectionMode: 'single',
    selectableFolders: true,
    filterable: true,
    filterPlaceholder: 'Search...',
    emptyText: 'No results found',
    motionCss: true,
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
    id: undefined,
    ui: undefined,
  },
)

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
   * `findTreeNode`/`findTreeParent`/`removeTreeNode` bound to this tree's `items`. */
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

function isCheckedNode(node: TreeNode): boolean {
  if (props.selectionMode === 'single') return model.value === node.value
  if (props.selectionMode === 'multiple')
    return Array.isArray(model.value) && model.value.includes(node.value)
  return stateByValue.value.get(node.value)?.checked ?? false
}
function isIndeterminateNode(node: TreeNode): boolean {
  if (props.selectionMode !== 'checkbox') return false
  return stateByValue.value.get(node.value)?.indeterminate ?? false
}
function ariaChecked(node: TreeNode): 'true' | 'false' | 'mixed' {
  if (isIndeterminateNode(node)) return 'mixed'
  return isCheckedNode(node) ? 'true' : 'false'
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
function rowEls(): HTMLElement[] {
  return Array.from(listEl.value?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])
}
function setRoving(target: HTMLElement | undefined) {
  for (const el of rowEls()) el.tabIndex = el === target ? 0 : -1
}
function focusRow(el: HTMLElement | undefined) {
  if (!el) return
  setRoving(el)
  el.focus()
}
function focusFirstRow() {
  focusRow(rowEls()[0])
}
function initRoving() {
  setRoving(rowEls()[0])
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
const messages = useUiMessages()
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
} = useSortable({
  rows: sortableRows,
  getElement: treeRowElement,
  nested: true,
  dropOnTarget: true,
  dragPreview: true,
  previewMode: () => props.previewMode,
  touchDragDelay: () => props.touchDragDelay,
  disabled: () => !props.reorderable,
  reorderSiblings: () => props.reorderSiblings,
  motionCss: () => props.motionCss,
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

function onTreeNavigationKeydown(event: KeyboardEvent) {
  const rows = rowEls()
  if (rows.length === 0) return
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  // Guard: resolve to owning row whether focus is on row div or nested input.
  const activeRow = active?.closest<HTMLElement>('[role="treeitem"]') ?? null
  const currentIndex = activeRow ? rows.indexOf(activeRow) : -1

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusRow(rows[Math.min(currentIndex + 1, rows.length - 1)] ?? rows[0])
      return
    case 'ArrowUp':
      event.preventDefault()
      focusRow(currentIndex <= 0 ? rows[0] : rows[currentIndex - 1])
      return
    case 'Home':
      event.preventDefault()
      focusRow(rows[0])
      return
    case 'End':
      event.preventDefault()
      focusRow(rows[rows.length - 1])
      return
    case 'ArrowRight': {
      if (currentIndex === -1) return
      const row = flatRows.value[currentIndex]
      if (!row || !row.hasChildren) return
      event.preventDefault()
      // ARIA APG: closed opens (focus stays); open moves to first child.
      if (!isExpanded(row.node)) toggleExpand(row.node)
      else focusRow(rows[currentIndex + 1])
      return
    }
    case 'ArrowLeft': {
      if (currentIndex === -1) return
      const row = flatRows.value[currentIndex]
      if (!row) return
      event.preventDefault()
      if (row.hasChildren && isExpanded(row.node)) {
        toggleExpand(row.node)
      } else if (row.parentValue != null) {
        const parentIndex = flatRows.value.findIndex((r) => r.node.value === row.parentValue)
        if (parentIndex !== -1) focusRow(rows[parentIndex])
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
      return
  }
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

// Cross-folder FLIP: a folder's own children fade in/out locally (see
// TreeNodeRow.vue), but a row several levels away that shifts because a
// NESTED folder changed height gets no local re-render signal. Measures
// every row's position before/after an expand/collapse and slides whatever
// moved. Currently-stuck sticky rows are excluded (their position is
// CSS-driven, not flow-driven) — checked live rather than by the sticky-
// capable class, since with stickyScroll on nearly every folder has that
// class whether or not it's actually pinned right now.
function isCurrentlyStuck(el: HTMLElement): boolean {
  if (!el.classList.contains('ui-tree-row--sticky') || !listEl.value) return false
  const stickyTop = Number.parseFloat(getComputedStyle(el).top)
  if (Number.isNaN(stickyTop)) return false
  const relativeTop = el.getBoundingClientRect().top - listEl.value.getBoundingClientRect().top
  return Math.abs(relativeTop - stickyTop) < 1
}
function captureRowRects(): Map<string, DOMRect> {
  const map = new Map<string, DOMRect>()
  if (!listEl.value) return map
  for (const el of listEl.value.querySelectorAll<HTMLElement>('[data-tree-value]')) {
    if (isCurrentlyStuck(el)) continue
    const key = el.dataset.treeValue
    if (key != null) map.set(key, el.getBoundingClientRect())
  }
  return map
}
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
let pendingBeforeRects: Map<string, DOMRect> | null = null
watch(
  expandedKeys,
  () => {
    if (!props.motionCss || prefersReducedMotion()) {
      pendingBeforeRects = null
      return
    }
    pendingBeforeRects = captureRowRects()
  },
  { flush: 'pre' },
)
watch(
  expandedKeys,
  () => {
    const before = pendingBeforeRects
    pendingBeforeRects = null
    if (!before || !listEl.value) return
    const after = captureRowRects()
    for (const [key, afterRect] of after) {
      const beforeRect = before.get(key)
      if (!beforeRect) continue // entering row — its own local enter transition handles it
      const deltaY = beforeRect.top - afterRect.top
      if (Math.abs(deltaY) < 1) continue
      const el = listEl.value.querySelector<HTMLElement>(`[data-tree-value="${CSS.escape(key)}"]`)
      if (!el) continue
      el.style.transition = 'none'
      el.style.transform = `translateY(${deltaY}px)`
      el.getBoundingClientRect() // force reflow before releasing the transform
      // Double rAF: matches Vue's own <Transition> enter scheduling, so the
      // slide and the entering children's fade start on the same frame.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform var(--ui-duration-enter) var(--ui-ease-in-out)'
          el.style.transform = ''
          el.addEventListener(
            'transitionend',
            () => {
              el.style.transition = ''
            },
            { once: true },
          )
        })
      })
    }
  },
  { flush: 'post' },
)

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
function nodePart(node: TreeNode) {
  return resolveUiPart(
    cx,
    themedUi()?.node,
    'ui-tree-row',
    node.disabled && 'ui-tree-row--disabled',
    props.selectionMode !== 'checkbox' && isCheckedNode(node) && 'ui-tree-row--selected',
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

const MAX_STICKY_DEPTH = 5
provide<TreeRowContext>(
  treeRowContextKey,
  reactive({
    selectionMode: computed(() => props.selectionMode),
    motionCss: computed(() => props.motionCss),
    stickyScroll: computed(() => props.stickyScroll),
    maxStickyDepth: MAX_STICKY_DEPTH,
    isExpanded,
    isCheckedNode,
    isIndeterminateNode,
    ariaChecked,
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
  /** The filter box's Input instance (null when `filterable` is off). */
  filterInputRef,
  /** Focuses the first visible row. */
  focusFirstRow,
  /** Makes the first visible row the tab stop without focusing it. */
  initRoving,
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
})
</script>
