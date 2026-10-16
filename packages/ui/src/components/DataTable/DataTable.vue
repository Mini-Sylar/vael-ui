<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-stacked="stacked ? '' : undefined"
    v-bind="attrs"
  >
    <div v-if="$slots.toolbar" :class="toolbarPart.class" :style="toolbarPart.style">
      <slot name="toolbar" :selected="selected" :count="sortedData.length" />
    </div>

    <div
      v-scroll-mask="scrollFade && !scrollHeight ? 'x' : false"
      class="ui-datatable-scroll-x"
      :data-frozen="frozenColumns > 0 || undefined"
    >
      <template v-if="scrollHeight">
        <!-- The body is the real scroller. The head strip mirrors it and is its own
             scroll container, so the head's frozen cells stick to it. -->
        <div
          ref="headScrollEl"
          v-scroll-mask="scrollFade ? 'x' : false"
          class="ui-datatable-head-scroll"
          :data-frozen="frozenColumns > 0 || undefined"
          :style="{ paddingInlineEnd: `${scrollbarWidth}px` }"
          tabindex="-1"
        >
          <table
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
        </div>
      </template>

      <table v-else :class="tablePart().class" :style="tablePart().style">
        <DataTableHead ref="headComponent" v-bind="headProps" />
        <DataTableBody v-bind="bodyProps">
          <template #loading><slot name="loading" /></template>
          <template #empty><slot name="empty" /></template>
          <template #expansion="{ row }"><slot name="expansion" :row="row" /></template>
        </DataTableBody>
      </table>
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

    <!-- display:none keeps Column children mounted for registration without rendering them -->
    <div style="display: none" aria-hidden="true">
      <slot name="columns" :Column="Column" :column-data="data" />
    </div>
  </div>
</template>

<!-- Columns register via provide/inject. Tests must disable VTU's transition-group stub. -->
<script setup lang="ts" generic="T extends Record<string, any>">
import './DataTable.css'
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
  useAttrs,
  useId,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrWindow } from '../../ssr'
import ColumnImpl from '../Column.vue'
import { radioGroupKey } from '../RadioGroup/RadioGroup.vue'
import { provideDataTableContext } from '../../composables/useDataTableContext'
import type { RegisteredColumn } from '../../composables/useDataTableContext'
import { useVirtualizer } from '../../composables/useVirtualizer'
import { useSortable } from '../../composables/useSortable'
import type { SortableDropDetails } from '../../composables/useSortable'
import DataTableHead from './DataTableHead.vue'
import DataTableBody from './DataTableBody.vue'
import type { TableRowEntry } from './DataTableBody.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'

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
    /** Plays the built-in row and column-drag transitions. `false` hands rows to `@row-enter`/`@row-leave`. @default true */
    motionCss?: boolean
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
      grip: UiPartValue
      resizeHandle: UiPartValue
      tbody: UiPartValue
      tr: UiPartValue
      td: UiPartValue
      expansionRow: UiPartValue
      expansionContent: UiPartValue
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
    motionCss: undefined,
    reorderableColumns: false,
    columnGripVisibility: 'always',
    canDrop: undefined,
    beforeDrop: undefined,
    previewMode: 'clone',
    touchDragDelay: 150,
  },
)
const props = withProviderDefaults(rawProps, { size: 'md', motionCss: true })

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
  /** Fires when a row enters. Call `done()` when finished; set `motionCss` to `false` to own the animation. */
  'row-enter': [el: Element, done: () => void]
  /** Fires when a row leaves. Call `done()` when finished, as with `@row-enter`. */
  'row-leave': [el: Element, done: () => void]
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

// Cast because ref() unwrapping widens `field: keyof T` to `string | number | symbol`.
const columns = ref<RegisteredColumn<T>[]>([]) as Ref<RegisteredColumn<T>[]>
function registerColumn(col: RegisteredColumn<T>) {
  columns.value.push(col)
}
function unregisterColumn(col: RegisteredColumn<T>) {
  const index = columns.value.indexOf(col)
  if (index !== -1) columns.value.splice(index, 1)
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

const selectColumnRendered = computed(() => props.selectable && props.selectionMode === 'checkbox')
const selectableRows = computed(() => props.selectable && props.selectionMode === 'row')
const expansionColumnRendered = computed(() => !!slots.expansion && !stacked.value)
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
    props.data.filter((row) => next.has(getRowKey(row))),
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
const selectAllState = computed(() => {
  if (sortedData.value.length === 0) return { all: false, some: false }
  let selectedCount = 0
  for (const row of sortedData.value) {
    if (selected.value.has(getRowKey(row))) selectedCount++
  }
  return { all: selectedCount === sortedData.value.length, some: selectedCount > 0 }
})
function toggleSelectAll() {
  const shouldSelect = !selectAllState.value.all
  for (const row of sortedData.value) {
    if (shouldSelect !== isSelected(row)) toggleSelect(row)
  }
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
const expansionIds = new Map<string | number, string>()
function expansionId(row: T): string {
  const key = getRowKey(row)
  let id = expansionIds.get(key)
  if (!id) {
    id = `${tableId}-expansion-${expansionIds.size}`
    expansionIds.set(key, id)
  }
  return id
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
    if (slots.expansion && (stacked.value || isExpanded(row))) {
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
const selectedKeyStrings = computed(() => new Set([...selected.value].map(String)))
const tabStopRowKey = computed<string | null>(() => {
  if (!selectableRows.value) return null
  const entries = tableRowEntries.value
  const indices = virtualizeActive.value
    ? virtualizer.items.value.map((item) => item.index)
    : entries.map((_, i) => i)
  const rendered: string[] = []
  for (const i of indices) if (entries[i]?.kind === 'row') rendered.push(entries[i]!.key)
  if (rendered.length === 0) return null
  // A focused row scrolled out of the virtual window can't hold the Tab stop.
  const focused = focusedRowKey.value
  if (focused !== null && rendered.includes(focused)) return focused
  return rendered.find((key) => selectedKeyStrings.value.has(key)) ?? rendered[0]!
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
const resizedWidths = ref(new Map<RegisteredColumn<T>, number>())
function setColumnWidth(col: RegisteredColumn<T>, width: number) {
  const next = new Map(resizedWidths.value)
  next.set(col, width)
  resizedWidths.value = next
  recomputeFrozenOffsets()
}
function columnStyle(col: RegisteredColumn<T>): Record<string, string> | undefined {
  const resized = resizedWidths.value.get(col)
  if (resized !== undefined) return { width: `${resized}px`, minWidth: `${resized}px` }
  if (col.width === undefined) return undefined
  const width = typeof col.width === 'number' ? `${col.width}px` : col.width
  return { width, minWidth: width }
}

const MIN_COLUMN_WIDTH = 40
let resizingColumn: RegisteredColumn<T> | null = null
let resizeStartX = 0
let resizeStartWidth = 0
let resizePointerId: number | null = null

function onResizePointerdown(col: RegisteredColumn<T>, event: PointerEvent) {
  event.preventDefault()
  const th = (event.currentTarget as HTMLElement).closest('th')
  if (!th) return
  resizingColumn = col
  resizeStartX = event.clientX
  resizeStartWidth = resizedWidths.value.get(col) ?? th.getBoundingClientRect().width
  resizePointerId = event.pointerId
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function onResizePointermove(event: PointerEvent) {
  if (!resizingColumn || resizePointerId !== event.pointerId) return
  const delta = event.clientX - resizeStartX
  setColumnWidth(resizingColumn, Math.max(MIN_COLUMN_WIDTH, resizeStartWidth + delta))
}
function onResizePointerup(event: PointerEvent) {
  if (resizePointerId !== event.pointerId) return
  resizingColumn = null
  resizePointerId = null
}
useEventListener(ssrWindow, 'pointermove', onResizePointermove)
useEventListener(ssrWindow, 'pointerup', onResizePointerup)
useEventListener(ssrWindow, 'pointercancel', onResizePointerup)

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
  )
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
  const left = frozenOffsets.value[colIndex] ?? leadingFixedWidth.value
  return { position: 'sticky', insetInlineStart: `${left}px`, zIndex: '2' }
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
} = useSortable({
  rows: columnRows,
  getElement: headerElement,
  axis: 'x',
  dragPreview: true,
  previewMode: () => props.previewMode,
  touchDragDelay: () => props.touchDragDelay,
  disabled: () => !props.reorderableColumns,
  motionCss: () => props.motionCss,
  canDrop: (details) => {
    // A pinned column can't be displaced, whatever the consumer's canDrop says.
    const target = orderedColumns.value[details.to.index]
    if (target && !isColumnReorderable(target)) return false
    return props.canDrop?.(details) ?? true
  },
  beforeDrop: props.beforeDrop ? (details) => props.beforeDrop!(details) : undefined,
  onDropError: (error, details) => emit('drop-error', error, details),
  onCommit: (value, to) => {
    const current = orderedColumns.value.map((column) => column.field)
    const from = current.indexOf(value as keyof T)
    if (from === -1) return
    const next = [...current]
    const [moved] = next.splice(from, 1)
    next.splice(Math.min(Math.max(to.index, 0), next.length), 0, moved!)
    columnOrder.value = next
    emit('column-reorder', next)
  },
})

// useSortable only moves header cells. Each frame this copies their shift onto the
// body cells, and moves the dragged column's cells with the preview.
let columnFollowFrame = 0
let lastDraggedColumn: string | null = null
function bodyCellsFor(field: string): HTMLElement[] {
  return Array.from(
    root.value?.querySelectorAll<HTMLElement>(
      `.ui-datatable-tbody .ui-datatable-td[data-column-field="${CSS.escape(field)}"]`,
    ) ?? [],
  )
}
function translateX(el: HTMLElement): number {
  return parseFloat(el.style.translate) || 0
}
function followColumnDrag() {
  columnFollowFrame = 0
  const head = headComponent.value?.rowEl
  if (!head) return
  const dragging = draggingColumn.value == null ? null : String(draggingColumn.value)
  if (dragging !== null) lastDraggedColumn = dragging
  let moving = dragging !== null
  for (const th of head.querySelectorAll<HTMLElement>('[data-column-field]')) {
    const field = th.dataset.columnField!
    const cells = bodyCellsFor(field)
    let shift = th.style.translate
    if (field === dragging && cells.length > 0) {
      // Clone mode floats a copy; element mode lifts the header itself.
      const preview = document.querySelector<HTMLElement>('[data-sortable-preview]') ?? th
      const cellLeft = cells[0]!.getBoundingClientRect().left - translateX(cells[0]!)
      const dx = preview.getBoundingClientRect().left - cellLeft
      shift = Math.abs(dx) < 0.5 ? '' : `${dx}px 0`
    }
    if (shift) moving = true
    // Lifted for the whole drag, and after the drop until the cells settle back.
    const lifted = field === lastDraggedColumn && (field === dragging || shift !== '')
    for (const cell of cells) {
      cell.style.translate = shift
      cell.toggleAttribute('data-column-dragging', lifted)
    }
  }
  if (moving) columnFollowFrame = requestAnimationFrame(followColumnDrag)
  else lastDraggedColumn = null
}
watch(draggingColumn, (value) => {
  if (value != null && !columnFollowFrame) {
    columnFollowFrame = requestAnimationFrame(followColumnDrag)
  }
})
onBeforeUnmount(() => cancelAnimationFrame(columnFollowFrame))

const headProps = computed(() => ({
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
  isColumnReorderable,
  columnGripVisibility: props.columnGripVisibility,
  draggingColumn: draggingColumn.value,
  onColumnPointerdown,
  consumeColumnClick,
  ui: {
    thead: themedUi()?.thead,
    th: themedUi()?.th,
    sortButton: themedUi()?.sortButton,
    grip: themedUi()?.grip,
    resizeHandle: themedUi()?.resizeHandle,
  },
}))
const bodyProps = computed(() => ({
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
  onToggleSelect: toggleSelect,
  onToggleExpand: toggleExpand,
  onRowClick,
  motionCss: props.motionCss,
  rowMotionReady: rowMotionReady.value,
  onRowEnter: (el: Element, done: () => void) => emit('row-enter', el, done),
  onRowLeave: (el: Element, done: () => void) => emit('row-leave', el, done),
  ui: {
    tbody: themedUi()?.tbody,
    tr: themedUi()?.tr,
    td: themedUi()?.td,
    expansionRow: themedUi()?.expansionRow,
    expansionContent: themedUi()?.expansionContent,
  },
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
})
</script>
