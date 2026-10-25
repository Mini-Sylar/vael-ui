<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[rootPart.style, columnVars]"
    :data-stacked="stacked ? '' : undefined"
    v-bind="attrs"
  >
    <div v-if="$slots.toolbar" :class="toolbarPart.class" :style="toolbarPart.style">
      <slot name="toolbar" :selected="selected" :count="sortedData.length" />
    </div>

    <div
      v-scroll-mask="scrollFade && !scrollHeight ? 'x' : false"
      ref="scrollXEl"
      class="ui-datatable-scroll-x"
      :data-frozen="frozenColumns > 0 || undefined"
      :role="scrollHeight ? (selectable ? 'grid' : 'table') : undefined"
      :aria-multiselectable="(scrollHeight && multiselectable) || undefined"
      :aria-busy="(scrollHeight && loading) || undefined"
    >
      <template v-if="scrollHeight">
        <!-- The body is the real scroller. The head strip mirrors it and is its own
             scroll container, so the head's frozen cells stick to it. -->
        <div
          ref="headScrollEl"
          role="rowgroup"
          v-scroll-mask="scrollFade ? 'x' : false"
          class="ui-datatable-head-scroll"
          :data-frozen="frozenColumns > 0 || undefined"
          :style="{ paddingInlineEnd: `${scrollbarWidth}px` }"
        >
          <!-- Head and body are separate <table>s, so ARIA roles rebuild one table across them. -->
          <table
            role="presentation"
            :class="tablePart('ui-datatable-table--split').class"
            :style="[tablePart().style, { inlineSize: splitWidth }]"
          >
            <!-- Fixed layout sizes columns from the first row, which in the body can be
                 a colspan spacer, so a colgroup keeps both tables aligned. -->
            <colgroup>
              <col v-for="(width, i) in colWidths" :key="i" :style="width" />
            </colgroup>
            <DataTableHead ref="headComponent" v-bind="headProps" />
          </table>
        </div>
        <div
          ref="bodyScrollEl"
          role="rowgroup"
          v-scroll-mask="scrollFade ? 'both' : false"
          class="ui-datatable-scroll-y"
          :data-frozen="frozenColumns > 0 || undefined"
          :style="{
            maxBlockSize: bodyMaxBlockSize,
            '--ui-datatable-scrollbar-w': `${scrollbarWidth}px`,
            '--ui-datatable-scrollbar-h': `${scrollbarHeight}px`,
          }"
        >
          <table
            role="presentation"
            :class="tablePart('ui-datatable-table--split').class"
            :style="[tablePart().style, { inlineSize: splitWidth }]"
          >
            <colgroup>
              <col v-for="(width, i) in colWidths" :key="i" :style="width" />
            </colgroup>
            <DataTableBody v-bind="bodyProps">
              <template #loading><slot name="loading" /></template>
              <template #empty><slot name="empty" /></template>
              <template #expansion="{ row }"><slot name="expansion" :row="row" /></template>
            </DataTableBody>
          </table>
          <div
            ref="hoverEl"
            class="ui-indicator ui-datatable-hover"
            :style="hoverStyle"
            aria-hidden="true"
          />
        </div>
      </template>

      <table
        v-else
        :class="tablePart().class"
        :style="tablePart().style"
        :role="selectable ? 'grid' : undefined"
        :aria-multiselectable="multiselectable || undefined"
        :aria-busy="loading || undefined"
      >
        <DataTableHead ref="headComponent" v-bind="headProps" />
        <DataTableBody v-bind="bodyProps">
          <template #loading><slot name="loading" /></template>
          <template #empty><slot name="empty" /></template>
          <template #expansion="{ row }"><slot name="expansion" :row="row" /></template>
        </DataTableBody>
      </table>
      <div
        v-if="!scrollHeight"
        ref="hoverEl"
        class="ui-indicator ui-datatable-hover"
        :style="hoverStyle"
        aria-hidden="true"
      />
    </div>

    <div v-if="$slots.footer" :class="footerPart.class" :style="footerPart.style">
      <slot
        name="footer"
        :data="sortedData"
        :page="currentPage"
        :page-count="totalPages"
        :total="resolvedTotal"
      />
    </div>

    <!-- Always mounted: a live region created on demand isn't reliably read out. -->
    <span class="ui-datatable-status" role="status" aria-live="polite">{{
      loading ? messages.dataTable.loading : announcement
    }}</span>
    <!-- Each row checkbox reads this, then its row's first cell. -->
    <span v-if="selectColumnRendered" :id="selectLabelId" hidden>{{
      messages.dataTable.selectRow
    }}</span>

    <!-- display:none keeps Column children mounted for registration without rendering them -->
    <div style="display: none" aria-hidden="true">
      <slot name="columns" :Column="Column" :column-data="data" />
    </div>
  </div>
</template>

<!-- Columns register via provide/inject. Tests must disable VTU's transition-group stub. -->
<script setup lang="ts" generic="T extends Record<string, any>">
import './DataTable.css'
import '../shared/indicator.css'
import { useHoverIndicator } from '../../composables/useHoverIndicator'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  provide,
  ref,
  shallowReactive,
  shallowRef,
  toRaw,
  useAttrs,
  useId,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import { inlineKey, useSlotPresence } from '../../composables/dom'
import { useEventListener } from '@vueuse/core'
import ColumnImpl from '../Column.vue'
import { radioGroupKey } from '../RadioGroup/RadioGroup.vue'
import { provideDataTableContext } from '../../composables/useDataTableContext'
import type { RegisteredColumn } from '../../composables/useDataTableContext'
import { useVirtualizer } from '../../composables/useVirtualizer'
import { loadColumnFollow, useLazySortable } from '../../composables/useLazySortable'
import type { SortableDropDetails } from '../../composables/useSortable'
import DataTableHead from './DataTableHead.vue'
import DataTableBody from './DataTableBody.vue'
import type { TableRowEntry } from './DataTableBody.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'
import { vScrollMask } from '../../directives/vScrollMask'
import { useFocusableScroller } from '../../composables/useFocusableScroller'
import { useComponentList } from '../../motion/useMotion'
import { useMotionStyle } from '../../motion/context'
import type { DataTableMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const rawProps = withDefaults(
  defineProps<{
    /** Row objects. Each `<Column>` reads its content from them by `field`. */
    data: T[]
    /** Stable row identity: a key on `T`, or a function for composite or derived keys. */
    rowKey: keyof T | ((row: T) => string | number)
    /** Shows the `#loading` slot instead of the rows or empty state. @default false */
    loading?: boolean
    /** Adds a leading checkbox or radio column that tracks the selection. @default false */
    selectable?: boolean
    /** `'checkbox'` adds a selection column. `'row'` selects on row click, with arrow-key navigation. @default 'checkbox' */
    selectionMode?: 'checkbox' | 'row'
    /** Limits selection to one row, with Radio buttons in `'checkbox'` mode. @default false */
    single?: boolean
    /** CSS length, such as `'400px'` or `'60vh'`. When set, the body scrolls under a sticky header. */
    scrollHeight?: string
    /** CSS length, such as `'640px'`. Below this viewport width, rows switch to a stacked card layout. */
    stackedBreakpoint?: string
    /** Row-density variant. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Alternates row backgrounds. Selected and hover backgrounds win over stripes. @default false */
    stripedRows?: boolean
    /** Adds an inline-end border to every cell. @default false */
    showGridlines?: boolean
    /** Adds a drag handle to every column header's edge for resizing. @default false */
    resizableColumns?: boolean
    /** Pins the first N columns to the left while the table scrolls horizontally. @default 0 */
    frozenColumns?: number
    /** Fades the edges that have more to scroll to, so it's clear the table scrolls. @default true */
    scrollFade?: boolean
    /** Rows per page. Pair it with `v-model:page`. Unset, all rows render. */
    rows?: number
    /** Marks `data` as sorted on the server; a header click only updates `v-model:sort`. @default false */
    manualSort?: boolean
    /** Marks `data` as the current page only. Pair it with `total`. @default false */
    lazy?: boolean
    /** Row count across all pages. Only used with `lazy`; unset, it falls back to `data.length`. */
    total?: number
    /** Renders only the visible rows. Requires `scrollHeight`. `itemSize` fixes the row height. */
    virtualize?: boolean | { itemSize?: number; overscan?: number; estimateSize?: number }
    /**
     * Plays the built-in row and column-drag transitions; `false` changes them at once. An object
     * animates the rows your way: values for the `row` part, or `enter` / `leave` hooks for your
     * own library. Past 150 rows, changes are instant either way.
     * @default true
     */
    motion?: DataTableMotion
    /** Lets you drag column headers to reorder them. Pair with `v-model:columnOrder`. @default false */
    reorderableColumns?: boolean
    /** When a reorderable column's drag grip shows: `'always'`, or only on hover and focus (`'hover'`). @default 'always' */
    columnGripVisibility?: 'hover' | 'always'
    /** Runs while a column drags; return `false` to mark the target invalid. */
    canDrop?: (details: SortableDropDetails) => boolean
    /** Async check before a column drop. Return `false`, or a promise of it, to cancel. */
    beforeDrop?: (details: SortableDropDetails) => boolean | Promise<boolean>
    /** What follows the pointer in a column drag. Avoid `'element'` here. @default 'clone' */
    previewMode?: 'element' | 'clone'
    /** Ms a touch must hold a header before a column drag starts, so taps still sort. @default 150 */
    touchDragDelay?: number
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      toolbar: UiPartValue
      table: UiPartValue
      thead: UiPartValue
      th: UiPartValue
      sortButton: UiPartValue
      /** The sort direction chevron inside a sortable header. */
      sortChevron: UiPartValue
      grip: UiPartValue
      resizeHandle: UiPartValue
      tbody: UiPartValue
      tr: UiPartValue
      td: UiPartValue
      expansionRow: UiPartValue
      expansionContent: UiPartValue
      /** The chevron on a row's expand button. */
      expandChevron: UiPartValue
      footer: UiPartValue
    }>
  }>(),
  {
    loading: false,
    selectable: false,
    selectionMode: 'checkbox',
    single: false,
    stripedRows: false,
    showGridlines: false,
    resizableColumns: false,
    frozenColumns: 0,
    scrollFade: true,
    manualSort: false,
    lazy: false,
    motion: undefined,
    reorderableColumns: false,
    columnGripVisibility: 'always',
    canDrop: undefined,
    beforeDrop: undefined,
    previewMode: 'clone',
    touchDragDelay: 150,
  },
)
const props = withProviderDefaults(rawProps, { size: 'md', motion: true })

const emit = defineEmits<{
  /** Fires when the selection changes, with the resolved row objects (not raw keys). */
  'update:selection': [rows: T[]]
  /** Fires when you click a row anywhere outside its interactive descendants. */
  'row-click': [row: T]
  /** Virtualized only: fires near the end of `data`, to fetch the next page. */
  'reach-end': []
  /** Virtualized only: fires when the rendered window nears the start of `data`, so you can fetch the previous page. */
  'reach-start': []
  /** Fires when a column drag commits, with the new `field` order. */
  'column-reorder': [order: (keyof T)[]]
  /** Fires when `beforeDrop` throws or rejects during a column reorder, after DataTable reverts the move. */
  'drop-error': [error: unknown, details: SortableDropDetails]
}>()

/** Current page, 1-based. Only used when `rows` is set; DataTable clamps it to the page count. @default 1 */
const page = defineModel<number>('page', { default: 1 })
/** Current sort field and direction. @default { field: null, dir: null } */
const sort = defineModel<{ field: keyof T | null; dir: 'asc' | 'desc' | null }>('sort', {
  default: () => ({ field: null, dir: null }),
})

const slots = useSlots()
const hasSlot = useSlotPresence(slots)

// Shallow, so the list holds each Column's own object: a deep ref would hand back proxies that
// never match the raw object a Column unregisters with. Its getters are reactive already.
const columns = shallowRef<RegisteredColumn<T>[]>([])
function registerColumn(col: RegisteredColumn<T>) {
  columns.value = [...columns.value, col]
}
function unregisterColumn(col: RegisteredColumn<T>) {
  if (columns.value.includes(col)) columns.value = columns.value.filter((c) => c !== col)
}

/** Column `field`s in display order. When empty, columns follow their `<Column>` order in the template. @default [] */
const columnOrder = defineModel<(keyof T)[]>('columnOrder', { default: () => [] })

const orderedColumns = computed<RegisteredColumn<T>[]>(() => {
  const order = columnOrder.value
  if (order.length === 0) return columns.value
  const byField = new Map(columns.value.map((column) => [column.field, column]))
  const ordered = order.map((field) => byField.get(field)).filter(Boolean) as RegisteredColumn<T>[]
  // Anything registered but not in the saved order keeps its DOM position.
  for (const column of columns.value) if (!order.includes(column.field)) ordered.push(column)
  return ordered
})

function resortColumnsByDom() {
  // A manual order is authoritative; re-deriving from the DOM would fight it.
  if (columnOrder.value.length > 0) return
  const sorted = [...columns.value].sort((a, b) => {
    if (!a.el || !b.el || a.el === b.el) return 0
    const position = a.el.compareDocumentPosition(b.el)
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
    return 0
  })
  const reordered = sorted.some((col, i) => col !== columns.value[i])
  if (reordered) columns.value = sorted
}
onMounted(resortColumnsByDom)
onUpdated(resortColumnsByDom)

const messages = useUiMessages()

const selectColumnRendered = computed(() => props.selectable && props.selectionMode === 'checkbox')
const selectableRows = computed(() => props.selectable && props.selectionMode === 'row')
const expansionColumnRendered = computed(() => hasSlot('expansion') && !stacked.value)
// Selectable rows carry aria-selected, which only a grid allows.
const multiselectable = computed(() => props.selectable && !props.single)
const colCount = computed(() => {
  let count = columns.value.length
  if (selectColumnRendered.value) count++
  if (expansionColumnRendered.value) count++
  return Math.max(count, 1)
})

// Reassigned whole: defineModel only emits update:sort through its setter.
function toggleSort(field: keyof T) {
  if (sort.value.field !== field) {
    sort.value = { field, dir: 'asc' }
  } else if (sort.value.dir === 'asc') {
    sort.value = { field, dir: 'desc' }
  } else {
    sort.value = { field: null, dir: null }
  }
}
function sortAriaValue(col: RegisteredColumn<T>): 'ascending' | 'descending' | 'none' {
  if (sort.value.field !== col.field || !sort.value.dir) return 'none'
  return sort.value.dir === 'asc' ? 'ascending' : 'descending'
}
function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return String(a).localeCompare(String(b))
}
const sortedData = computed(() => {
  if (props.manualSort) return props.data
  const { field, dir } = sort.value
  if (!field || !dir) return props.data
  const direction = dir === 'asc' ? 1 : -1
  return [...props.data].sort((a, b) => compareValues(a[field], b[field]) * direction)
})

// With `lazy`, `data` is already one page, so page math divides `total` instead.
const resolvedTotal = computed(() =>
  props.lazy ? (props.total ?? sortedData.value.length) : sortedData.value.length,
)
const totalPages = computed(() =>
  props.rows ? Math.max(1, Math.ceil(resolvedTotal.value / props.rows)) : 1,
)
const currentPage = computed(() => Math.min(Math.max(page.value, 1), totalPages.value))

watch(totalPages, (count) => {
  if (page.value > count) page.value = count
})
const pagedData = computed(() => {
  if (props.lazy || !props.rows) return sortedData.value
  const start = (currentPage.value - 1) * props.rows
  return sortedData.value.slice(start, start + props.rows)
})

function getRowKey(row: T): string | number {
  return typeof props.rowKey === 'function'
    ? props.rowKey(row)
    : (row[props.rowKey] as unknown as string | number)
}
const selected = ref(new Set<string | number>())
function isSelected(row: T): boolean {
  return selected.value.has(getRowKey(row))
}
function setSelection(next: Set<string | number>) {
  selected.value = next
  emit(
    'update:selection',
    next.size === 0 ? [] : props.data.filter((row) => next.has(getRowKey(row))),
  )
}
function toggleSelectByKey(key: string | number) {
  if (props.single) {
    setSelection(selected.value.has(key) ? new Set() : new Set([key]))
    return
  }
  const next = new Set(selected.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  setSelection(next)
}
function toggleSelect(row: T) {
  toggleSelectByKey(getRowKey(row))
}

// Computed from sortedData not data: app owns bulk-selection policy, DataTable owns mechanism.
const sortedKeys = computed(() => new Set(sortedData.value.map(getRowKey)))
// Keeps the previous object while nothing flips, so toggling one row doesn't re-render the header.
const selectAllState = computed<{ all: boolean; some: boolean }>((previous) => {
  const keys = sortedKeys.value
  const chosen = selected.value
  let count = 0
  if (chosen.size <= keys.size) {
    for (const key of chosen) if (keys.has(key)) count++
  } else {
    for (const key of keys) if (chosen.has(key)) count++
  }
  const all = keys.size > 0 && count === keys.size
  const some = count > 0
  return previous?.all === all && previous.some === some ? previous : { all, some }
})
function toggleSelectAll() {
  const shouldSelect = !selectAllState.value.all
  const next = new Set(selected.value)
  for (const key of sortedKeys.value) {
    if (shouldSelect) next.add(key)
    else next.delete(key)
  }
  if (next.size !== selected.value.size) setSelection(next)
}

// Provided directly: RadioGroup's wrapper element can't live inside a table.
const selectionRadioName = useId()
provide(radioGroupKey, {
  name: () => selectionRadioName,
  isChecked: (value) => selected.value.has(value),
  select: (value) => toggleSelectByKey(value),
  disabled: () => false,
})

const expanded = ref(new Set<string | number>())
function isExpanded(row: T): boolean {
  return expanded.value.has(getRowKey(row))
}
// Row keys can hold characters an id can't, so ids come from a per-key counter.
const tableId = useId()
const rowIdIndex = new Map<string | number, number>()
function rowIdSuffix(row: T): number {
  const key = getRowKey(row)
  let index = rowIdIndex.get(key)
  if (index === undefined) {
    index = rowIdIndex.size
    rowIdIndex.set(key, index)
  }
  return index
}
function expansionId(row: T): string {
  return `${tableId}-expansion-${rowIdSuffix(row)}`
}
const selectLabelId = `${tableId}-select-label`
// The row's first cell, which names its checkbox.
function rowLabelId(row: T): string {
  return `${tableId}-label-${rowIdSuffix(row)}`
}
function toggleExpand(row: T) {
  const key = getRowKey(row)
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

const tableRowEntries = computed<TableRowEntry<T>[]>(() => {
  const entries: TableRowEntry<T>[] = []
  for (const row of pagedData.value) {
    const key = String(getRowKey(row))
    entries.push({ kind: 'row', row, key })
    if (hasSlot('expansion') && (stacked.value || isExpanded(row))) {
      entries.push({ kind: 'expansion', row, key: `${key}-expansion` })
    }
  }
  return entries
})

const bodyScrollEl = useTemplateRef<HTMLElement>('bodyScrollEl')
const virtualizeActive = computed(() => !!props.virtualize)
const virtualizeConfig = computed(() =>
  typeof props.virtualize === 'object' ? props.virtualize : {},
)
const virtualizer = useVirtualizer({
  containerEl: bodyScrollEl,
  count: () => (virtualizeActive.value ? tableRowEntries.value.length : 0),
  itemSize: () => virtualizeConfig.value.itemSize,
  overscan: () => virtualizeConfig.value.overscan,
  // Rows can wrap or stack, so measure each one unless itemSize fixes the height.
  dynamic: () => virtualizeConfig.value.itemSize === undefined,
  estimateSize: () => virtualizeConfig.value.estimateSize,
  onReachEnd: () => emit('reach-end'),
  onReachStart: () => emit('reach-start'),
})
const topSpacerHeight = computed(() => virtualizer.items.value[0]?.start ?? 0)
const bottomSpacerHeight = computed(() => {
  const items = virtualizer.items.value
  if (items.length === 0) return 0
  const last = items[items.length - 1]!
  return Math.max(0, virtualizer.totalSize.value - (last.start + last.size))
})

// Roving tabindex for selectionMode="row": the body is one Tab stop.
const focusedRowKey = ref<string | null>(null)
const tabStopRowKey = computed<string | null>(() => {
  if (!selectableRows.value) return null
  const entries = tableRowEntries.value
  const indices = virtualizeActive.value
    ? virtualizer.items.value.map((item) => item.index)
    : entries.map((_, i) => i)
  const rendered: TableRowEntry<T>[] = []
  for (const i of indices) if (entries[i]?.kind === 'row') rendered.push(entries[i]!)
  if (rendered.length === 0) return null
  // A focused row scrolled out of the virtual window can't hold the Tab stop.
  const focused = focusedRowKey.value
  if (focused !== null && rendered.some((entry) => entry.key === focused)) return focused
  const chosen = selected.value
  return (rendered.find((entry) => chosen.has(getRowKey(entry.row))) ?? rendered[0]!).key
})
function rowTabIndex(row: T): number | undefined {
  if (!selectableRows.value) return undefined
  return String(getRowKey(row)) === tabStopRowKey.value ? 0 : -1
}

function findRowElement(key: string): HTMLElement | null {
  return (
    root.value?.querySelector<HTMLElement>(
      `.ui-datatable-tbody [data-row-key="${CSS.escape(key)}"]`,
    ) ?? null
  )
}
async function focusRowEntry(entryIndex: number) {
  const entry = tableRowEntries.value[entryIndex]
  if (!entry) return
  focusedRowKey.value = entry.key
  // The target may sit outside the rendered window; scrolling first makes it render.
  if (virtualizeActive.value) virtualizer.scrollToIndex(entryIndex)
  await nextTick()
  findRowElement(entry.key)?.focus()
}
function onRowFocus(row: T, event: FocusEvent) {
  if (event.target === event.currentTarget) focusedRowKey.value = String(getRowKey(row))
}
function onRowKeydown(row: T, event: KeyboardEvent) {
  // Keys pressed inside a cell's own controls (buttons, inputs) stay theirs.
  if (!selectableRows.value || event.target !== event.currentTarget) return
  const entries = tableRowEntries.value
  const rowIndices: number[] = []
  entries.forEach((entry, i) => entry.kind === 'row' && rowIndices.push(i))
  const key = String(getRowKey(row))
  const position = rowIndices.findIndex((i) => entries[i]!.key === key)
  if (position === -1) return

  let target: number | undefined
  switch (event.key) {
    case 'ArrowDown':
      target = rowIndices[Math.min(position + 1, rowIndices.length - 1)]
      break
    case 'ArrowUp':
      target = rowIndices[Math.max(position - 1, 0)]
      break
    case 'Home':
      target = rowIndices[0]
      break
    case 'End':
      target = rowIndices[rowIndices.length - 1]
      break
    case ' ':
      event.preventDefault()
      toggleSelect(row)
      return
    case 'Enter':
      event.preventDefault()
      toggleSelect(row)
      emit('row-click', row)
      return
    default:
      return
  }
  event.preventDefault()
  if (target === undefined) return
  const targetRow = entries[target]!.row
  if (event.shiftKey && !props.single && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    // Shift+Arrow extends: both ends of the step end up selected.
    const next = new Set(selected.value)
    next.add(getRowKey(row))
    next.add(getRowKey(targetRow))
    if (next.size !== selected.value.size) setSelection(next)
  }
  void focusRowEntry(target)
}

function onRowClick(row: T, event: MouseEvent) {
  const target = event.target as HTMLElement
  if (
    target.closest('input, button, a, [role="checkbox"], [role="radio"], .ui-checkbox, .ui-radio')
  )
    return
  if (props.selectable && props.selectionMode === 'row') toggleSelect(row)
  emit('row-click', row)
}

provideDataTableContext<T>({
  registerColumn,
  unregisterColumn,
  sort,
  toggleSort,
  selected,
  toggleSelect,
  isSelected,
  getRowKey,
})

// Runtime prop needs matchMedia since CSS media queries don't accept var() in conditions.
const stacked = ref(false)
let stackedQuery: MediaQueryList | undefined
function onStackedQueryChange(event: MediaQueryListEvent) {
  stacked.value = event.matches
}
function syncStackedQuery() {
  stackedQuery?.removeEventListener('change', onStackedQueryChange)
  stackedQuery = undefined
  if (!props.stackedBreakpoint || typeof window === 'undefined') {
    stacked.value = false
    return
  }
  stackedQuery = window.matchMedia(`(max-width: ${props.stackedBreakpoint})`)
  stacked.value = stackedQuery.matches
  stackedQuery.addEventListener('change', onStackedQueryChange)
}
onMounted(syncStackedQuery)
watch(() => props.stackedBreakpoint, syncStackedQuery)
onBeforeUnmount(() => stackedQuery?.removeEventListener('change', onStackedQueryChange))

const rootClasses = computed(() => [
  `ui-datatable--${props.size}`,
  props.stripedRows && 'ui-datatable--striped',
  props.showGridlines && 'ui-datatable--gridlines',
])

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.dataTable,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-datatable', ...rootClasses.value),
)
const toolbarPart = computed(() => resolveUiPart(cx, themedUi()?.toolbar, 'ui-datatable-toolbar'))
function tablePart(...extra: (string | false | undefined)[]) {
  return resolveUiPart(cx, themedUi()?.table, 'ui-datatable-table', ...extra)
}
const footerPart = computed(() => resolveUiPart(cx, themedUi()?.footer, 'ui-datatable-footer'))

function isColumnResizable(col: RegisteredColumn<T>): boolean {
  return col.resizable ?? props.resizableColumns
}
function isColumnReorderable(col: RegisteredColumn<T>): boolean {
  return col.reorderable ?? props.reorderableColumns
}
// Widths and offsets go through CSS vars, so a drag restyles the root instead of every cell.
// Names carry the table id, so a nested table can't pick up its parent's values.
const varPrefix = `--ui-datatable-${tableId.replace(/[^\w-]/g, '')}`
let columnVarSeq = 0
const columnVarIds = new WeakMap<RegisteredColumn<T>, number>()
function columnWidthVar(col: RegisteredColumn<T>): string {
  const raw = toRaw(col)
  let id = columnVarIds.get(raw)
  if (id === undefined) {
    id = columnVarSeq++
    columnVarIds.set(raw, id)
  }
  return `${varPrefix}-w-${id}`
}
const resizedWidths = shallowReactive(new Map<RegisteredColumn<T>, number>())
// Changes only when a column is resized for the first time, not on every move.
const resizedColumns = shallowReactive(new Set<RegisteredColumn<T>>())
const columnVars = computed(() => {
  const vars: Record<string, string> = {}
  for (const [col, width] of resizedWidths) vars[columnWidthVar(col)] = `${width}px`
  frozenOffsets.value.forEach((left, i) => {
    vars[`${varPrefix}-frozen-${i}`] = `${left}px`
  })
  return vars
})
function setColumnWidth(col: RegisteredColumn<T>, width: number) {
  const raw = toRaw(col)
  resizedWidths.set(raw, width)
  resizedColumns.add(raw)
}
function columnStyle(col: RegisteredColumn<T>): Record<string, string> | undefined {
  if (resizedColumns.has(toRaw(col))) {
    const width = `var(${columnWidthVar(col)})`
    return { width, minWidth: width }
  }
  if (col.width === undefined) return undefined
  const width = typeof col.width === 'number' ? `${col.width}px` : col.width
  return { width, minWidth: width }
}

const MIN_COLUMN_WIDTH = 40
let resizingColumn: RegisteredColumn<T> | null = null
let resizeStartX = 0
let resizeStartWidth = 0
let resizePointerId: number | null = null
let resizeClientX = 0
let resizeFrame = 0

function onResizePointerdown(col: RegisteredColumn<T>, event: PointerEvent) {
  event.preventDefault()
  const th = (event.currentTarget as HTMLElement).closest('th')
  if (!th) return
  resizingColumn = col
  resizeStartX = event.clientX
  resizeClientX = event.clientX
  resizeStartWidth = resizedWidths.get(toRaw(col)) ?? th.getBoundingClientRect().width
  resizePointerId = event.pointerId
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onResizePointermove)
  window.addEventListener('pointerup', onResizePointerup)
  window.addEventListener('pointercancel', onResizePointerup)
}
function applyResize() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = 0
  if (!resizingColumn) return
  const delta = resizeClientX - resizeStartX
  setColumnWidth(resizingColumn, Math.max(MIN_COLUMN_WIDTH, resizeStartWidth + delta))
}
// One width update per frame; pointer events can outpace the display.
function onResizePointermove(event: PointerEvent) {
  if (!resizingColumn || resizePointerId !== event.pointerId) return
  resizeClientX = event.clientX
  if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize)
}
function stopResize() {
  window.removeEventListener('pointermove', onResizePointermove)
  window.removeEventListener('pointerup', onResizePointerup)
  window.removeEventListener('pointercancel', onResizePointerup)
  cancelAnimationFrame(resizeFrame)
  resizeFrame = 0
  resizingColumn = null
  resizePointerId = null
}
function onResizePointerup(event: PointerEvent) {
  if (resizePointerId !== event.pointerId) return
  if (resizeFrame) applyResize()
  stopResize()
}
onBeforeUnmount(stopResize)

// Read politely through the status region: keyboard resizes and column moves.
const announcement = ref('')
function columnLabel(col: RegisteredColumn<T>): string {
  return col.label ?? String(col.field)
}
// Widths for the resize handles' aria-valuenow, until a resize sets its own.
const measuredWidths = shallowReactive(new Map<RegisteredColumn<T>, number>())
function measureColumnWidths() {
  for (const col of orderedColumns.value) {
    if (!isColumnResizable(col) || resizedColumns.has(toRaw(col))) continue
    const th = headerElement(col.field as string | number)
    if (!th) continue
    const width = Math.round(th.getBoundingClientRect().width)
    if (measuredWidths.get(toRaw(col)) !== width) measuredWidths.set(toRaw(col), width)
  }
}
function columnWidthNow(col: RegisteredColumn<T>): number | undefined {
  const width = resizedWidths.get(toRaw(col)) ?? measuredWidths.get(toRaw(col))
  return width === undefined ? undefined : Math.round(width)
}
const KEYBOARD_RESIZE_STEP = 16 // px, as Resizable
function onResizeKeydown(col: RegisteredColumn<T>, event: KeyboardEvent) {
  if (event.altKey) return
  const handle = event.currentTarget as HTMLElement
  // Right to left the handle sits on the left edge, so ArrowLeft grows the column.
  const key = inlineKey(event.key, handle)
  const step =
    key === 'ArrowRight' ? KEYBOARD_RESIZE_STEP : key === 'ArrowLeft' ? -KEYBOARD_RESIZE_STEP : 0
  if (!step) return
  event.preventDefault()
  const th = handle.closest('th')
  if (!th) return
  const start = resizedWidths.get(toRaw(col)) ?? th.getBoundingClientRect().width
  const width = Math.max(MIN_COLUMN_WIDTH, Math.round(start + step))
  setColumnWidth(col, width)
  announcement.value = messages.value.dataTable.columnWidth
    .replace('{label}', columnLabel(col))
    .replace('{width}', String(width))
}

// Alt + ArrowLeft / ArrowRight moves a reorderable column one place, from its header.
async function onHeaderKeydown(col: RegisteredColumn<T>, event: KeyboardEvent) {
  if (!event.altKey || event.ctrlKey || event.metaKey || !isColumnReorderable(col)) return
  const th = event.currentTarget as HTMLElement
  const key = inlineKey(event.key, th)
  const step = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0
  if (!step) return
  event.preventDefault()
  const columnsNow = orderedColumns.value
  const from = columnsNow.indexOf(col)
  const to = from + step
  const target = columnsNow[to]
  if (from === -1 || !target || !isColumnReorderable(target)) return
  const value = col.field as string | number
  const details: SortableDropDetails = {
    value,
    from: { parentValue: null, index: from, depth: 0 },
    to: { parentValue: null, index: to, depth: 0 },
  }
  if (props.canDrop && !props.canDrop(details)) return
  if (props.beforeDrop) {
    try {
      if (!(await props.beforeDrop(details))) return
    } catch (error) {
      emit('drop-error', error, details)
      return
    }
  }
  const focused = document.activeElement as HTMLElement | null
  commitColumnMove(value, to)
  announcement.value = messages.value.sortable.moved
    .replace('{label}', columnLabel(col))
    .replace('{position}', String(to + 1))
    .replace('{total}', String(columnsNow.length))
  // Moving the header can drop focus; it stays where it was.
  await nextTick()
  if (focused?.isConnected && document.activeElement !== focused)
    focused.focus({ preventScroll: true })
}
function commitColumnMove(value: string | number, toIndex: number) {
  const current = orderedColumns.value.map((column) => column.field)
  const from = current.indexOf(value as keyof T)
  if (from === -1) return
  const next = [...current]
  const [moved] = next.splice(from, 1)
  next.splice(Math.min(Math.max(toIndex, 0), next.length), 0, moved!)
  columnOrder.value = next
  emit('column-reorder', next)
}

const UTILITY_COLUMN_WIDTH = 44 // px, matches the 2.75rem select/expand cells
const leadingFixedWidth = computed(() => {
  let width = 0
  if (selectColumnRendered.value) width += UTILITY_COLUMN_WIDTH
  if (expansionColumnRendered.value) width += UTILITY_COLUMN_WIDTH
  return width
})
const colWidths = computed<(Record<string, string> | undefined)[]>(() => {
  const widths: (Record<string, string> | undefined)[] = []
  if (selectColumnRendered.value) widths.push({ width: `${UTILITY_COLUMN_WIDTH}px` })
  if (expansionColumnRendered.value) widths.push({ width: `${UTILITY_COLUMN_WIDTH}px` })
  for (const col of columns.value) widths.push(columnStyle(col))
  return widths
})

// Fixed layout gives a column without a width only the space left over, which is none once the
// table overflows. Reserve a floor for each, so the table scrolls instead of hiding them.
const AUTO_COLUMN_MIN = '8rem'
const splitWidth = computed(() => {
  const widths = colWidths.value
  const auto = widths.filter((w) => !w).length
  if (!auto) return undefined
  const fixed = widths.flatMap((w) => (w ? [w.width] : []))
  return `max(100%, ${[...fixed, `${auto} * ${AUTO_COLUMN_MIN}`].join(' + ')})`
})
function isFrozenColumn(colIndex: number): boolean {
  return props.frozenColumns > 0 && colIndex < props.frozenColumns
}
// Loosely typed: InstanceType can't read a generic SFC (see TypedColumn below).
const headComponent = useTemplateRef<{ rowEl: HTMLElement | null }>('headComponent')
const frozenOffsets = ref<number[]>([])
const headerHeight = ref(0)
function recomputeFrozenOffsets() {
  if (props.frozenColumns <= 0) {
    if (frozenOffsets.value.length > 0) frozenOffsets.value = []
    return
  }
  const row = headComponent.value?.rowEl
  if (!row) return
  const ths = Array.from(
    row.querySelectorAll<HTMLElement>(
      '.ui-datatable-th:not(.ui-datatable-th--select):not(.ui-datatable-th--expand)',
    ),
  ).slice(0, props.frozenColumns)
  let cumulative = leadingFixedWidth.value
  const offsets: number[] = []
  for (const th of ths) {
    offsets.push(cumulative)
    cumulative += th.getBoundingClientRect().width
  }
  const changed =
    offsets.length !== frozenOffsets.value.length ||
    offsets.some((value, i) => value !== frozenOffsets.value[i])
  if (changed) frozenOffsets.value = offsets
}
function columnFrozenStyle(colIndex: number): Record<string, string> | undefined {
  if (!isFrozenColumn(colIndex)) return undefined
  const left = `var(${varPrefix}-frozen-${colIndex}, ${leadingFixedWidth.value}px)`
  return { position: 'sticky', insetInlineStart: left, zIndex: '2' }
}
function utilityFrozenStyle(kind: 'select' | 'expand'): Record<string, string> | undefined {
  if (props.frozenColumns <= 0) return undefined
  const left = kind === 'select' ? 0 : selectColumnRendered.value ? UTILITY_COLUMN_WIDTH : 0
  return { position: 'sticky', insetInlineStart: `${left}px`, zIndex: '2' }
}
// Subtracted from scrollHeight so header plus body stays within it.
function recomputeHeaderHeight() {
  const row = headComponent.value?.rowEl
  const height = row ? row.getBoundingClientRect().height : 0
  if (height !== headerHeight.value) headerHeight.value = height
}
// The first measurement re-render looks like a reorder to TransitionGroup.
// Row move stays off until it has passed.
const rowMotionReady = ref(false)
onMounted(() => {
  recomputeFrozenOffsets()
  recomputeHeaderHeight()
  nextTick(() => {
    rowMotionReady.value = true
  })
})
onUpdated(() => {
  recomputeFrozenOffsets()
  recomputeHeaderHeight()
})
let resizeObserver: ResizeObserver | undefined
let observedHeaderEl: HTMLElement | null = null
function syncHeaderObserver() {
  const el = headComponent.value?.rowEl ?? null
  if (el === observedHeaderEl) return
  if (observedHeaderEl) resizeObserver?.unobserve(observedHeaderEl)
  observedHeaderEl = el
  if (el) resizeObserver?.observe(el)
}
onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => {
    recomputeFrozenOffsets()
    recomputeHeaderHeight()
    measureColumnWidths()
  })
  syncHeaderObserver()
})
onUpdated(syncHeaderObserver)
onBeforeUnmount(() => resizeObserver?.disconnect())

// The body's scrollbar narrows its content box; padding the head strip by the same width
// keeps columns aligned. Not on the table: collapsed borders ignore table padding.
const scrollbarWidth = ref(0)
// The fade masks the body's own scrollbars too, so both sizes keep them out of it.
const scrollbarHeight = ref(0)
function recomputeScrollbarWidth() {
  const el = bodyScrollEl.value
  const width = el ? el.offsetWidth - el.clientWidth : 0
  const height = el ? el.offsetHeight - el.clientHeight : 0
  if (width !== scrollbarWidth.value) scrollbarWidth.value = width
  if (height !== scrollbarHeight.value) scrollbarHeight.value = height
}
let bodyResizeObserver: ResizeObserver | undefined
onMounted(() => {
  recomputeScrollbarWidth()
  if (typeof ResizeObserver === 'undefined' || !bodyScrollEl.value) return
  bodyResizeObserver = new ResizeObserver(() => recomputeScrollbarWidth())
  bodyResizeObserver.observe(bodyScrollEl.value)
})
onUpdated(recomputeScrollbarWidth)
onBeforeUnmount(() => bodyResizeObserver?.disconnect())
// Two-way, so wheel, touch, focus and drag autoscroll on the head strip move the body.
// Echoes of our own writes are skipped, or a stale one would undo momentum scrolling.
const headScrollEl = useTemplateRef<HTMLElement>('headScrollEl')
const scrollXEl = useTemplateRef<HTMLElement>('scrollXEl')

// The row hover slides between body rows, inside whichever box scrolls the body; a table nested in
// an expanded row has its own. Not in the stacked card layout.
const hoverEl = useTemplateRef<HTMLElement>('hoverEl')
const { style: hoverStyle } = useHoverIndicator(
  computed(() => (props.scrollHeight ? bodyScrollEl.value : scrollXEl.value) ?? null),
  {
    itemSelector:
      '.ui-datatable-tbody > .ui-datatable-tr:not(.ui-datatable-tr--expansion, .ui-datatable-tr--spacer):not(:has(> .ui-datatable-td--loading, > .ui-datatable-td--empty))',
    scope: '.ui-datatable-scroll-y, .ui-datatable-scroll-x',
    scroller: true,
    enabled: () => !stacked.value,
    motion: () => props.motion,
    indicatorEl: hoverEl,
  },
)
// Each strip that can scroll takes a tab stop only while it holds nothing focusable.
useFocusableScroller(scrollXEl)
useFocusableScroller(headScrollEl)
useFocusableScroller(bodyScrollEl)
let headWrittenLeft: number | null = null
let bodyWrittenLeft: number | null = null
function mirrorScrollLeft(from: HTMLElement, to: HTMLElement): number | null {
  const left = from.scrollLeft
  if (Math.abs(to.scrollLeft - left) < 1) return null
  to.scrollLeft = left
  return to.scrollLeft
}
function onBodyScroll() {
  const head = headScrollEl.value
  const body = bodyScrollEl.value
  if (!head || !body) return
  if (bodyWrittenLeft !== null && Math.abs(body.scrollLeft - bodyWrittenLeft) < 1) {
    bodyWrittenLeft = null
    return
  }
  bodyWrittenLeft = null
  headWrittenLeft = mirrorScrollLeft(body, head)
}
function onHeadScroll() {
  const head = headScrollEl.value
  const body = bodyScrollEl.value
  if (!head || !body) return
  if (headWrittenLeft !== null && Math.abs(head.scrollLeft - headWrittenLeft) < 1) {
    headWrittenLeft = null
    return
  }
  headWrittenLeft = null
  bodyWrittenLeft = mirrorScrollLeft(head, body)
  // The body may stop short of where the head went, so the head snaps back to it.
  if (Math.abs(head.scrollLeft - body.scrollLeft) >= 1)
    headWrittenLeft = mirrorScrollLeft(body, head)
}
useEventListener(bodyScrollEl, 'scroll', onBodyScroll, { passive: true })
useEventListener(headScrollEl, 'scroll', onHeadScroll, { passive: true })
const bodyMaxBlockSize = computed(() =>
  props.scrollHeight ? `calc(${props.scrollHeight} - ${headerHeight.value}px)` : undefined,
)

function headerElement(field: string | number): HTMLElement | null {
  return (
    headComponent.value?.rowEl?.querySelector<HTMLElement>(
      `[data-column-field="${CSS.escape(String(field))}"]`,
    ) ?? null
  )
}
const columnRows = computed(() =>
  orderedColumns.value.map((column) => ({
    value: column.field as string | number,
    depth: 0,
    parentValue: null,
  })),
)
const {
  activeValue: draggingColumn,
  onHandlePointerdown: onColumnPointerdown,
  consumeSuppressedClick: consumeColumnClick,
} = useLazySortable(
  {
    rows: columnRows,
    getElement: headerElement,
    axis: 'x',
    dragPreview: true,
    previewMode: () => props.previewMode,
    touchDragDelay: () => props.touchDragDelay,
    disabled: () => !props.reorderableColumns,
    motion: () => props.motion,
    canDrop: (details) => {
      // A pinned column can't be displaced, whatever the consumer's canDrop says.
      const target = orderedColumns.value[details.to.index]
      if (target && !isColumnReorderable(target)) return false
      return props.canDrop?.(details) ?? true
    },
    beforeDrop: props.beforeDrop ? (details) => props.beforeDrop!(details) : undefined,
    onDropError: (error, details) => emit('drop-error', error, details),
    onCommit: (value, to) => commitColumnMove(value, to.index),
  },
  () => props.reorderableColumns,
)

// useSortable only moves header cells; the body cells follow them (columnFollow.ts, fetched with
// reorderable columns, before any drag).
if (rawProps.reorderableColumns) void loadColumnFollow()
let columnFollow: { start: () => void; stop: () => void } | undefined
watch(draggingColumn, (value) => {
  if (value == null) return
  void loadColumnFollow().then((module) => {
    columnFollow ??= module.createColumnFollow(
      () => root.value,
      () => headComponent.value?.rowEl,
      () => (draggingColumn.value == null ? null : String(draggingColumn.value)),
    )
    columnFollow.start()
  })
})
onBeforeUnmount(() => columnFollow?.stop())

const headProps = computed(() => ({
  split: !!props.scrollHeight,
  selectColumnRendered: selectColumnRendered.value,
  expansionColumnRendered: expansionColumnRendered.value,
  columns: orderedColumns.value,
  frozenColumns: props.frozenColumns,
  single: props.single,
  selectAllState: selectAllState.value,
  sort: sort.value,
  isFrozenColumn,
  columnFrozenStyle,
  utilityFrozenStyle,
  columnStyle,
  isColumnResizable,
  sortAriaValue,
  onToggleSelectAll: toggleSelectAll,
  onToggleSort: toggleSort,
  onResizePointerdown,
  onResizeKeydown,
  onResizeFocus: measureColumnWidths,
  columnWidthNow,
  onHeaderKeydown,
  isColumnReorderable,
  columnGripVisibility: props.columnGripVisibility,
  draggingColumn: draggingColumn.value,
  onColumnPointerdown,
  consumeColumnClick,
  ui: {
    thead: themedUi()?.thead,
    th: themedUi()?.th,
    sortButton: themedUi()?.sortButton,
    sortChevron: themedUi()?.sortChevron,
    grip: themedUi()?.grip,
    resizeHandle: themedUi()?.resizeHandle,
  },
}))
// Yours (an object, or a shared style): rows come and go on the motion system, kept in the table's
// flow as they leave. Otherwise the built-in CSS look.
const motionStyle = useMotionStyle()
const listMotion =
  (typeof rawProps.motion === 'object' ||
    motionStyle?.value?.dataTable ||
    motionStyle?.value?.list) &&
  props.motion !== false
    ? useComponentList(() => rawProps.motion, {
        key: 'dataTable',
        part: 'row',
        name: 'DataTable',
        look: { opacity: 0 },
        leaving: 'hold',
        arranged: true,
      })
    : undefined
const bodyUi = computed(() => ({
  tbody: themedUi()?.tbody,
  tr: themedUi()?.tr,
  td: themedUi()?.td,
  expansionRow: themedUi()?.expansionRow,
  expansionContent: themedUi()?.expansionContent,
  expandChevron: themedUi()?.expandChevron,
}))
const bodyProps = computed(() => ({
  split: !!props.scrollHeight,
  colCount: colCount.value,
  columns: orderedColumns.value,
  loading: props.loading,
  isEmpty: sortedData.value.length === 0,
  virtualizeActive: virtualizeActive.value,
  tableRowEntries: tableRowEntries.value,
  virtualItems: virtualizer.items.value,
  topSpacerHeight: topSpacerHeight.value,
  bottomSpacerHeight: bottomSpacerHeight.value,
  measureRow: virtualizer.measureRow,
  selectColumnRendered: selectColumnRendered.value,
  expansionColumnRendered: expansionColumnRendered.value,
  selectableRows: selectableRows.value,
  frozenColumns: props.frozenColumns,
  single: props.single,
  isFrozenColumn,
  columnFrozenStyle,
  utilityFrozenStyle,
  columnStyle,
  isSelected,
  getRowKey,
  isExpanded,
  selectable: props.selectable,
  rowTabIndex,
  onRowFocus,
  onRowKeydown,
  expansionId,
  rowLabelId,
  selectLabelId,
  onToggleSelect: toggleSelect,
  onToggleExpand: toggleExpand,
  onRowClick,
  motion: !!props.motion,
  rowMotionReady: rowMotionReady.value,
  rowTransition: listMotion?.transition as Record<string, unknown> | undefined,
  ui: bodyUi.value,
}))

// Binds Column to this table's `T`, so `field`, `#cell` and `#header` are typed.
// A hand-written shape because InstanceType can't read a generic SFC.
type TypedColumn = new () => {
  $props: {
    field: keyof T
    label?: string
    sortable?: boolean
    width?: string | number
    resizable?: boolean
  }
  $slots: {
    cell?: (p: { row: T; value: T[keyof T] }) => any
    header?: (p: { column: RegisteredColumn<T> }) => any
  }
}
const Column = ColumnImpl as unknown as TypedColumn

defineSlots<{
  /** Declares `<Column>` children. `columnData` is the table's `:data`, passed back for type inference. */
  columns(props: { Column: TypedColumn; columnData: T[] }): any
  /** Toolbar content (search, bulk actions, …). */
  toolbar(props: { selected: Set<string | number>; count: number }): any
  /** Replaces the row area while `loading` is true. */
  loading(): any
  /** Replaces the row area when `data` is empty and not loading. */
  empty(): any
  /** Footer content (pagination, …). `data` is sorted, not paginated; the slot always receives `page` and `pageCount`. */
  footer(props: { data: T[]; page: number; pageCount: number; total: number }): any
  /** Full-width row beneath an expanded row. In stacked mode, it always renders, with no toggle. */
  expansion(props: { row: T }): any
}>()

const root = useTemplateRef<HTMLElement>('root')

defineExpose({
  /** Root element. */
  el: root,
  /** The hover and keyboard highlight, sliding between body rows. With `motion: false` it moves at once, for your own animation. */
  highlightEl: hoverEl,
})
</script>
