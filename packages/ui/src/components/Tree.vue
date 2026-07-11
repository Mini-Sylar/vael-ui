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
        v-if="flatRows.length === 0"
        :class="emptyPart.class"
        :style="emptyPart.style"
        role="presentation"
      >
        <slot name="empty">{{ emptyText }}</slot>
      </div>
      <TransitionGroup
        v-else
        :name="motionCss ? 'ui-tree-row' : undefined"
        tag="div"
        class="ui-tree-rows"
      >
        <div
          v-for="(row, i) in flatRows"
          :key="row.key"
          role="treeitem"
          tabindex="-1"
          :class="nodePart(row).class"
          :style="[indentStyle(row.depth), nodePart(row).style]"
          :data-tree-index="i"
          :aria-level="row.depth + 1"
          :aria-expanded="row.hasChildren ? isExpanded(row.node) : undefined"
          :aria-disabled="row.node.disabled || undefined"
          :aria-selected="
            selectionMode !== 'checkbox' ? (isCheckedNode(row.node) ? 'true' : 'false') : undefined
          "
          :aria-checked="selectionMode === 'checkbox' ? ariaChecked(row.node) : undefined"
          @click="onRowClick(row.node, $event)"
        >
          <slot
            name="node"
            :node="row.node"
            :depth="row.depth"
            :expanded="row.hasChildren && isExpanded(row.node)"
            :checked="isCheckedNode(row.node)"
            :indeterminate="isIndeterminateNode(row.node)"
            :disabled="!!row.node.disabled"
            :toggle-expand="() => toggleExpand(row.node)"
            :toggle-select="() => activateNode(row.node)"
          >
            <span
              v-if="row.hasChildren"
              :class="chevronPart.class"
              :style="chevronPart.style"
              aria-hidden="true"
              :data-state="isExpanded(row.node) ? 'open' : 'closed'"
              @click="toggleExpand(row.node)"
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
              :model-value="isCheckedNode(row.node)"
              :indeterminate="isIndeterminateNode(row.node)"
              :disabled="row.node.disabled"
              size="sm"
              :aria-label="row.node.label"
              @update:model-value="() => activateNode(row.node)"
            />
            <span :class="labelPart.class" :style="labelPart.style">{{ row.node.label }}</span>
            <svg
              v-if="selectionMode === 'single' && isCheckedNode(row.node)"
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
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script lang="ts">
export interface TreeNode {
  label: string
  value: string | number
  children?: readonly TreeNode[]
  disabled?: boolean
}

export type TreeSelectionMode = 'single' | 'multiple' | 'checkbox'
</script>

<!-- Tree extracts logic for standalone or nested use; TreeSelect wraps it in popover.
     Independent DOM class set (ui-tree-*); TreeSelect passes ui overrides for legacy passenger classes (ui-tree-select-*).
     Focus delegation: focusFirstRow/initRoving exposed; roving tabindex internal; focus stealing is popover-specific (TreeSelect only).
     Animation: motionCss=false disables TransitionGroup and chevron rotation via data-motion="off" on root. -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'
import Input from './Input.vue'
import Checkbox from './Checkbox.vue'

const model = defineModel<string | number | (string | number)[] | null>({ default: null })
const query = defineModel<string>('query', { default: '' })

const props = withDefaults(
  defineProps<{
    items: readonly TreeNode[]
    /** `'single'`: clicking replaces the selection. `'multiple'`: clicking toggles that node only. `'checkbox'`: checkboxes with cascading parent/child toggles. */
    selectionMode?: TreeSelectionMode
    /** Shows a built-in label search box atop the tree, auto-expanding ancestors of any match. Default: on. */
    filterable?: boolean
    filterPlaceholder?: string
    emptyText?: string
    /** `false` skips all built-in motion (row transitions and chevron rotation). */
    motionCss?: boolean
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
    filterable: true,
    filterPlaceholder: 'Search...',
    emptyText: 'No results found',
    motionCss: true,
    id: undefined,
    ui: undefined,
  },
)

const emit = defineEmits<{
  change: [value: string | number | (string | number)[] | null]
  select: [node: TreeNode]
  /** Fires on manual expand/collapse (not auto-expansion via filtering). */
  'expand-change': [value: string | number, expanded: boolean]
}>()

defineSlots<{
  /** Row content (inside the library's role="treeitem" wrapper). */
  node(props: {
    node: TreeNode
    depth: number
    expanded: boolean
    checked: boolean
    indeterminate: boolean
    disabled: boolean
    toggleExpand: () => void
    toggleSelect: () => void
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
  emit('select', node)
}
function toggleMultiple(node: TreeNode) {
  const current = Array.isArray(model.value) ? [...model.value] : []
  const index = current.indexOf(node.value)
  if (index === -1) current.push(node.value)
  else current.splice(index, 1)
  model.value = current
  emit('change', current)
  emit('select', node)
}
function selectSingle(node: TreeNode) {
  model.value = node.value
  emit('change', node.value)
  emit('select', node)
}
function activateNode(node: TreeNode) {
  if (node.disabled) return
  if (props.selectionMode === 'checkbox') toggleCheckbox(node)
  else if (props.selectionMode === 'multiple') toggleMultiple(node)
  else selectSingle(node)
}

const expandedKeys = ref(new Set<string | number>())

// Diacritic-insensitive normalization.
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

interface FlatNode {
  key: string
  node: TreeNode
  depth: number
  parentValue: string | number | null
  hasChildren: boolean
}
// Depth-first flatten (own copy due to different semantics).
function flatten(
  nodes: readonly TreeNode[],
  depth: number,
  parentValue: string | number | null,
  out: FlatNode[],
) {
  for (const node of nodes) {
    if (isFiltering.value && !subtreeMatchSet.value.has(node.value)) continue
    const hasChildren = !!node.children && node.children.length > 0
    out.push({ key: String(node.value), node, depth, parentValue, hasChildren })
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

function indentStyle(depth: number) {
  return depth > 0 ? { '--ui-tree-depth': depth } : undefined
}

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
function nodePart(row: FlatNode) {
  return resolveUiPart(
    cx,
    themedUi()?.node,
    'ui-tree-row',
    row.node.disabled && 'ui-tree-row--disabled',
    props.selectionMode !== 'checkbox' && isCheckedNode(row.node) && 'ui-tree-row--selected',
  )
}

defineExpose({
  listEl,
  filterInputRef,
  focusFirstRow,
  initRoving,
})
</script>
