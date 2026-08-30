<template>
  <div
    ref="root"
    v-bind="attrs"
    class="ui-datatable"
    :class="rootClasses"
    :data-stacked="stacked ? '' : undefined"
  >
    <div v-if="$slots.toolbar" class="ui-datatable-toolbar">
      <slot name="toolbar" :selected="selected" :count="sortedData.length" />
    </div>

    <div class="ui-datatable-scroll-x">
      <template v-if="scrollHeight">
        <table
          class="ui-datatable-table ui-datatable-table--split"
          :style="{ paddingInlineEnd: `${scrollbarWidth}px` }"
        >
          <!-- table-layout:fixed only sizes columns from a table's first row;
               the body table's first row is a virtualize spacer with no
               per-column cells, so an explicit colgroup is what actually
               keeps these two tables' columns aligned. -->
          <colgroup>
            <col v-for="(width, i) in colWidths" :key="i" :style="width" />
          </colgroup>
          <DataTableHead ref="headComponent" v-bind="headProps" />
        </table>
        <div
          ref="bodyScrollEl"
          class="ui-datatable-scroll-y"
          :style="{ maxBlockSize: bodyMaxBlockSize }"
        >
          <table class="ui-datatable-table ui-datatable-table--split">
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

      <table v-else class="ui-datatable-table">
        <DataTableHead ref="headComponent" v-bind="headProps" />
        <DataTableBody v-bind="bodyProps">
          <template #loading><slot name="loading" /></template>
          <template #empty><slot name="empty" /></template>
          <template #expansion="{ row }"><slot name="expansion" :row="row" /></template>
        </DataTableBody>
      </table>
    </div>

    <div v-if="$slots.footer" class="ui-datatable-footer">
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

<!-- Slot-based: columns register via provide/inject, no config prop. Generic inference: `T` inferred from `:data` binding.
     Row enter/exit/reorder is a TransitionGroup in DataTableBody, gated by motionCss — same
     contract as Toaster (row-enter/row-leave forward its (el, done) hook). Skipped while
     virtualized. Tests need VTU's transition-group stub disabled — see data-table.test.ts.
     Pagination (rows/page): array slicing, internal; DataTable provides state to #footer slot.
     Single-select mode reuses Radio via direct injection (RadioGroup's wrapper incompatible here).
     Resize drag is direct manipulation per pointermove frame.
     frozenColumns: table-level math for cumulative offsets, since Column can't know what precedes it.
     Expansion: full-width row per `Ref<Set<...>>`, collapsed in stacked mode (no toggle). -->
<script setup lang="ts" generic="T extends Record<string, any>">
import './DataTable.css'
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

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Row objects. Column content is read from these via each `<Column>`'s `field`. */
    data: T[]
    /** Stable row identity — a key on `T`, or a function for composite/derived keys. */
    rowKey: keyof T | ((row: T) => string | number)
    /** Shows the `#loading` slot instead of rows/empty state. */
    loading?: boolean
    /** Adds a leading checkbox/radio column wired to the `selected` state. */
    selectable?: boolean
    /** `'checkbox'` (default): leading selection column. `'row'`: click row to toggle selection. */
    selectionMode?: 'checkbox' | 'row'
    /** Single-selection mode — `selected` holds at most one key. In `'checkbox'` mode uses `Radio`. */
    single?: boolean
    /** CSS length (`'400px'`, `'60vh'`). When set, body scrolls with sticky header; unset uses natural flow. */
    scrollHeight?: string
    /** CSS length (`'640px'`). Below this viewport width, switches to stacked card layout. */
    stackedBreakpoint?: string
    /** Row-density variant. */
    size?: 'sm' | 'md' | 'lg'
    /** Alternating row background via CSS (selected > hover > stripe precedence). */
    stripedRows?: boolean
    /** Adds inline-end border to every cell. */
    showGridlines?: boolean
    /** Enables resize drag handle on every column header. */
    /** Adds a drag handle to every column header's edge for resizing. */
    resizableColumns?: boolean
    /** Freezes the first N columns sticky-left against horizontal scroll. */
    frozenColumns?: number
    /** Rows per page. Default: all rows render. Set: internal slicing; pair with `v-model:page`. Also the page-size divisor for `lazy`'s `total`. */
    rows?: number
    /** `data` is already sorted server-side — DataTable stops sorting it locally and only reflects `v-model:sort`, so a header click tells you what to refetch instead of re-sorting what you gave it. */
    manualSort?: boolean
    /** `data` is already just the current page — DataTable stops slicing it locally. Pair with `total` (the real across-all-pages count) so `#footer`/`Pagination` math stays correct. */
    lazy?: boolean
    /** Real row count across all pages. Only meaningful with `lazy`; falls back to `sortedData.length` (i.e. `data.length`) when unset. */
    total?: number
    /** Windows rendering to the visible rows + overscan, for very large `data`. Requires `scrollHeight`. `true` measures each row's real height (rows may vary, e.g. wrapping `#cell` content or `stackedBreakpoint`); pass an object to tune it. */
    virtualize?: boolean | { itemSize?: number; overscan?: number; estimateSize?: number }
    /** Gates the built-in row enter/exit/reorder transition (sort, paging, row expansion).
     * `false` skips it entirely — reach for `@row-enter`/`@row-leave` instead if you want a
     * consumer-owned animation (GSAP, motion-v) in its place. No effect while `virtualize` is
     * active: a virtualized list's rows are measured/recycled by height, which a CSS enter/exit
     * transition would fight, so that mode never animates row presence regardless of this prop. */
    motionCss?: boolean
    /** Drag column headers to reorder them. Pair with `v-model:columnOrder` to control or persist the order. */
    reorderableColumns?: boolean
    /** `'always'` (default): the drag grip is always shown, so a reorderable column reads as
     * such at a glance. `'hover'`: fades in on hover/focus instead, matching the resize
     * handle's own restraint — reach for this once a table has enough reorderable columns
     * that permanent grips would clutter the header. */
    columnGripVisibility?: 'hover' | 'always'
    /** Structural veto re-run while a column drags; `false` marks the target invalid.
     * A pinned column is already protected regardless of this. */
    canDrop?: (details: SortableDropDetails) => boolean
    /** Async gate at drop time for a column reorder — return `false` (or a promise of
     * it) to cancel. Composes with `confirmAction().result` for a confirm-before-move
     * dialog. */
    beforeDrop?: (details: SortableDropDetails) => boolean | Promise<boolean>
    /** `'clone'` (default): a floating copy of the dragged column header follows
     * the cursor, the real `<th>` hidden until drop. `'element'` moves the real
     * header cell itself instead — **don't use this**: a `<th>`'s `:style` binding
     * is keyed by column index, and lifting the real element out to `position:
     * fixed` mid-drag corrupts that binding badly enough that a column can be
     * lost from the DOM entirely on drop. Kept only for interface symmetry with
     * `Sortable`/`Tree`, where it's safe. */
    previewMode?: 'element' | 'clone'
    /** Ms a touch pointer must hold a column header still before a drag
     * starts. A sortable column's header is also a tap-to-sort button, so
     * touch needs a hold to tell the two apart; mouse/pen are unaffected.
     * Default `150`. */
    touchDragDelay?: number
  }>(),
  {
    loading: false,
    selectable: false,
    selectionMode: 'checkbox',
    single: false,
    size: 'md',
    stripedRows: false,
    showGridlines: false,
    resizableColumns: false,
    frozenColumns: 0,
    manualSort: false,
    lazy: false,
    motionCss: true,
    reorderableColumns: false,
    columnGripVisibility: 'always',
    canDrop: undefined,
    beforeDrop: undefined,
    previewMode: 'clone',
    touchDragDelay: 150,
  },
)

const emit = defineEmits<{
  /** Fires when selection changes, with resolved row objects (not raw keys). */
  'update:selection': [rows: T[]]
  /** A click anywhere on a row outside its interactive descendants. */
  'row-click': [row: T]
  /** Virtualized only: the rendered window neared the end of `data` — fetch the next page. */
  'reach-end': []
  /** Virtualized only: the rendered window neared the start of `data` — fetch the previous page. */
  'reach-start': []
  /** Column headers were dragged into a new order, newest first argument. */
  'column-reorder': [order: (keyof T)[]]
  /** A row's enter transition started — forwarded straight from the underlying
   * TransitionGroup's own `(el, done)` hook. Call `done()` yourself and set
   * `motionCss` to `false` to fully hand the enter animation to GSAP/motion-v/etc. */
  'row-enter': [el: Element, done: () => void]
  /** Same as `row-enter`, for a row's exit. */
  'row-leave': [el: Element, done: () => void]
  /** `beforeDrop` threw or rejected while reordering a column; the move was already reverted. */
  'drop-error': [error: unknown, details: SortableDropDetails]
}>()

const page = defineModel<number>('page', { default: 1 })
/** Uncontrolled by default (works exactly as before). Bind `v-model:sort` — required
 * with `manualSort` — to see every header click and know what to refetch. */
const sort = defineModel<{ field: keyof T | null; dir: 'asc' | 'desc' | null }>('sort', {
  default: () => ({ field: null, dir: null }),
})

const slots = useSlots()

// Two <Column>s CAN legitimately share a `field` (e.g. one showing a row's
// id, another using that same id for a selection checkbox) — the template's
// thead/tbody loops key on array INDEX, not `col.field`, for exactly that
// reason.
//
// Cast, not a bare `ref<RegisteredColumn<T>[]>([])`: same UnwrapNestedRefs
// generic-index-type limitation as `sort` below — `ref()`'s return type
// recursively unwraps array element properties too, mangling `field: keyof
// T` back down to `string | number | symbol`.
const columns = ref<RegisteredColumn<T>[]>([]) as Ref<RegisteredColumn<T>[]>
function registerColumn(col: RegisteredColumn<T>) {
  columns.value.push(col)
}
function unregisterColumn(col: RegisteredColumn<T>) {
  const index = columns.value.indexOf(col)
  if (index !== -1) columns.value.splice(index, 1)
}

/** Empty means "follow the DOM" (pre-reordering behavior); once a drag sets
 * it, it outranks DOM order so the onUpdated resort below doesn't undo it. */
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
// Drives the pointer-cursor affordance on click-anywhere-to-select rows.
const selectableRows = computed(() => props.selectable && props.selectionMode === 'row')
const expansionColumnRendered = computed(() => !!slots.expansion && !stacked.value)
const colCount = computed(() => {
  let count = columns.value.length
  if (selectColumnRendered.value) count++
  if (expansionColumnRendered.value) count++
  return Math.max(count, 1)
})

// Reassigns sort.value wholesale rather than mutating its properties in
// place — defineModel's local (unbound) fallback only triggers reactivity
// and emits update:sort through its actual setter, not on nested mutation.
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

// Unset `rows` (the default): `totalPages` is always 1 and `pagedData` is
// always `sortedData` verbatim — zero behavior change for every existing
// consumer.
// `lazy`: `data` IS the current page already (the server decided its size),
// so `total` (not `data.length`) is what page-count math divides by `rows`.
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
    // At most one key, ever — same `Ref<Set<...>>` shape, just capped.
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

// Provided directly (RadioGroup wrapper architecturally incompatible).
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

// The virtualizer listens to this, not the outer horizontal-scroll div —
// it's the actual vertically-scrolling ancestor once the header is split out.
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
  // Default to per-row measurement, not a shared itemSize — a DataTable row's
  // height isn't guaranteed uniform (wrapping #cell content, stackedBreakpoint)
  // the way a Select option's is. Set itemSize to opt into the faster fixed path.
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

// Guard: interactive descendants (checkbox, button, link) must not also fire row click.
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

// Column's own resizable prop wins over table-level default.
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

// Width commits on every pointermove frame (direct manipulation, no transition).
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

// Utility columns (select/expand) are fixed-width; real columns need live measurement.
const UTILITY_COLUMN_WIDTH = 44 // px — matches --select/--expand's 2.75rem
const leadingFixedWidth = computed(() => {
  let width = 0
  if (selectColumnRendered.value) width += UTILITY_COLUMN_WIDTH
  if (expansionColumnRendered.value) width += UTILITY_COLUMN_WIDTH
  return width
})
// Order must match the cells: select, expand, then real columns.
const colWidths = computed<(Record<string, string> | undefined)[]>(() => {
  const widths: (Record<string, string> | undefined)[] = []
  if (selectColumnRendered.value) widths.push({ width: `${UTILITY_COLUMN_WIDTH}px` })
  if (expansionColumnRendered.value) widths.push({ width: `${UTILITY_COLUMN_WIDTH}px` })
  for (const col of columns.value) widths.push(columnStyle(col))
  return widths
})
function isFrozenColumn(colIndex: number): boolean {
  return props.frozenColumns > 0 && colIndex < props.frozenColumns
}
// Loosely typed, not `InstanceType<typeof DataTableHead>` — same generic-SFC
// limitation `TypedColumn` below works around; only `rowEl` is needed here.
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
// Feeds bodyMaxBlockSize below: scrollHeight minus this keeps the total
// visible area (header + body) equal to what `scrollHeight` always meant.
function recomputeHeaderHeight() {
  const row = headComponent.value?.rowEl
  const height = row ? row.getBoundingClientRect().height : 0
  if (height !== headerHeight.value) headerHeight.value = height
}
// headerHeight/frozen offsets start at 0 and get corrected once the real DOM
// (and, via ResizeObserver, the header's settled width) is measurable — a
// genuine re-render that TransitionGroup can't tell apart from a real row
// reorder, so it plays the move animation on rows that never actually moved.
// DataTableBody uses this to disable just that CSS transition (not the
// hooks) until the first settling render has passed — see its own comment.
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

// The body's own scrollbar narrows its content width but the head table
// (not scrolling) doesn't lose that space — pad the head table to match.
const scrollbarWidth = ref(0)
function recomputeScrollbarWidth() {
  const el = bodyScrollEl.value
  const width = el ? el.offsetWidth - el.clientWidth : 0
  if (width !== scrollbarWidth.value) scrollbarWidth.value = width
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
    // A pinned column can't be displaced out of its slot either, regardless
    // of what a consumer's own canDrop says.
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
  onToggleSelect: toggleSelect,
  onToggleExpand: toggleExpand,
  onRowClick,
  motionCss: props.motionCss,
  rowMotionReady: rowMotionReady.value,
  onRowEnter: (el: Element, done: () => void) => emit('row-enter', el, done),
  onRowLeave: (el: Element, done: () => void) => emit('row-leave', el, done),
}))

// The generic-inference handoff (see the SFC comment above): `T` is bound
// here from `:data="users"` at the usage site, so casting Column's own
// implementation against it makes `field`/`#cell`/`#header` fully typed for
// consumers with zero manual annotation on their end.
//
// A manual `$props`/`$slots` shape, not `InstanceType<typeof ColumnImpl>` —
// Column.vue is itself a generic SFC, so vue-tsc types its default export as
// a generic function over Column's OWN type parameter, which is not a
// constructor signature `InstanceType` can extract from (Select.vue hits
// the identical wall with `SelectListBody` and documents the same fix: name
// the shape directly instead of deriving it). The `new () => { $props;
// $slots }` class-component shape is what Volar's template checker reads to
// type-check `<Column field=… #cell=… #header=…>` — ColumnImpl's REAL type
// is irrelevant to that checking once cast, only this declared shape is.
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
  /** Declare `<Column>` children. `columnData` is the table's `:data`, handed back for type-inference. */
  columns(props: { Column: TypedColumn; columnData: T[] }): any
  /** Toolbar content (search, bulk actions, …). */
  toolbar(props: { selected: Set<string | number>; count: number }): any
  /** Replaces row area while `loading` is true. */
  loading(): any
  /** Replaces row area when data is empty and not loading. */
  empty(): any
  /** Footer content (pagination, …). `data` is sorted (not paginated); `page`/`pageCount` are always provided. */
  footer(props: { data: T[]; page: number; pageCount: number; total: number }): any
  /** Full-width row beneath an expanded row. In stacked mode, always renders (no toggle). */
  expansion(props: { row: T }): any
}>()

const root = useTemplateRef<HTMLElement>('root')

defineExpose({ el: root })
</script>
