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
/** Mutates `nodes` (and its nested `children` arrays) in place — same
 * "Tree owns no copy" contract as adding/renaming. Returns whether a match
 * was found and removed. */
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

const model = defineModel<string | number | (string | number)[] | null>({ default: null })
const query = defineModel<string>('query', { default: '' })

const props = withDefaults(
  defineProps<{
    items: readonly T[]
    /** `'single'`: clicking replaces the selection. `'multiple'`: clicking toggles that node only. `'checkbox'`: checkboxes with cascading parent/child toggles. */
    selectionMode?: TreeSelectionMode
    /** `false` keeps a node with children out of the selection entirely — click, keyboard Enter/Space,
     * and expandOnRowClick's own select-on-expand all skip it, only a leaf can become the value. Has
     * no effect in `selectionMode="checkbox"`, which already only ever puts leaves in the model.
     * Default: true (a folder can be selected like any other node). */
    selectableFolders?: boolean
    /** Shows a built-in label search box atop the tree, auto-expanding ancestors of any match. Default: on. */
    filterable?: boolean
    filterPlaceholder?: string
    emptyText?: string
    /** `false` skips all built-in motion (row transitions, chevron rotation, and cross-folder move). */
    motionCss?: boolean
    /** When true, clicking anywhere on a folder row also toggles its expansion, not just the chevron —
     * it still selects too (unless `selectableFolders` is off), so picking the folder itself (without
     * opening it to reach a file inside) still works. Off by default since it changes what a plain row
     * click does. */
    expandOnRowClick?: boolean
    /** When true, each expanded ancestor's row pins to the top of the list as its own children scroll
     * past, VS Code-style, so deeply nested content never loses its folder context. Uses native
     * `position: sticky` — each row is a real, nested DOM level, not a JS-measured overlay. */
    stickyScroll?: boolean
    /** Id for the role="tree" list element. Auto-generated if omitted. */
    id?: string
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
    expandOnRowClick: false,
    stickyScroll: false,
    id: undefined,
    ui: undefined,
  },
)

const emit = defineEmits<{
  change: [value: string | number | (string | number)[] | null]
  select: [node: T]
  /** Fires on manual expand/collapse (not auto-expansion via filtering). */
  'expand-change': [value: string | number, expanded: boolean]
}>()

defineSlots<{
  /** Row content (inside the library's role="treeitem" wrapper). findNode/findParent/removeNode
   * are shorthand for findTreeNode/findTreeParent/removeTreeNode bound to this instance's own
   * `items`, for the common case of looking up a sibling/parent/self without importing them. */
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
  /** Replaces the default empty-state row shown when nothing survives the filter. */
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

// Diacritic-insensitive normalization.
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
const normalizedQuery = computed(() => normalize(query.value.trim()))
const isFiltering = computed(() => normalizedQuery.value.length > 0)
function nodeMatches(node: TreeNode): boolean {
  return normalize(node.label).includes(normalizedQuery.value)
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

function onTreeKeydown(event: KeyboardEvent) {
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
  }),
)

defineExpose({
  listEl,
  filterInputRef,
  focusFirstRow,
  initRoving,
  expandAll,
  collapseAll,
  expandNode,
  collapseNode,
  findNode,
  findParent,
  removeNode,
})
</script>
