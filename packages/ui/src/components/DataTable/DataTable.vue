<template>
  <div
    ref="root"
    class="ui-datatable"
    :class="rootClasses"
    :data-stacked="stacked ? '' : undefined"
  >
    <div v-if="$slots.toolbar" class="ui-datatable-toolbar">
      <slot name="toolbar" :selected="selected" :count="sortedData.length" />
    </div>

    <div
      class="ui-datatable-scroll-x"
      :class="{ 'ui-datatable-scroll-x--scrollable': !!scrollHeight }"
      :style="scrollHeight ? { maxHeight: scrollHeight } : undefined"
    >
      <table class="ui-datatable-table">
        <thead class="ui-datatable-thead">
          <tr ref="theadRow" class="ui-datatable-tr">
            <th
              v-if="selectColumnRendered"
              scope="col"
              class="ui-datatable-th ui-datatable-th--select"
              :class="{ 'ui-datatable-th--frozen': frozenColumns > 0 }"
              :style="utilityFrozenStyle('select')"
            >
              <Checkbox
                v-if="!single"
                :model-value="selectAllState.all"
                :indeterminate="selectAllState.some && !selectAllState.all"
                aria-label="Select all rows"
                @update:model-value="toggleSelectAll"
              />
            </th>
            <th
              v-if="expansionColumnRendered"
              scope="col"
              class="ui-datatable-th ui-datatable-th--expand"
              :class="{ 'ui-datatable-th--frozen': frozenColumns > 0 }"
              :style="utilityFrozenStyle('expand')"
              aria-hidden="true"
            ></th>
            <th
              v-for="(col, colIndex) in columns"
              :key="colIndex"
              scope="col"
              class="ui-datatable-th"
              :class="{
                'ui-datatable-th--frozen': isFrozenColumn(colIndex),
                'ui-datatable-th--frozen-end': colIndex === frozenColumns - 1,
              }"
              :style="[columnStyle(col), columnFrozenStyle(colIndex)]"
              :aria-sort="col.sortable ? sortAriaValue(col) : undefined"
            >
              <component :is="col.headerSlot" v-if="col.headerSlot" :column="col" />
              <button
                v-else-if="col.sortable"
                type="button"
                class="ui-datatable-sort-button"
                @click="toggleSort(col.field)"
              >
                <span class="ui-datatable-th-label">{{ col.label ?? String(col.field) }}</span>
                <span
                  class="ui-datatable-sort-chevron"
                  :data-state="sort.field === col.field ? sort.dir : 'none'"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </button>
              <span v-else class="ui-datatable-th-label">{{ col.label ?? String(col.field) }}</span>
              <span
                v-if="isColumnResizable(col)"
                class="ui-datatable-resize-handle"
                aria-hidden="true"
                @pointerdown="onResizePointerdown(col, $event)"
              ></span>
            </th>
          </tr>
        </thead>

        <tbody v-if="loading" class="ui-datatable-tbody">
          <tr class="ui-datatable-tr">
            <td class="ui-datatable-td ui-datatable-td--loading" :colspan="colCount">
              <slot name="loading" />
            </td>
          </tr>
        </tbody>

        <tbody v-else-if="sortedData.length === 0" class="ui-datatable-tbody">
          <tr class="ui-datatable-tr">
            <td class="ui-datatable-td ui-datatable-td--empty" :colspan="colCount">
              <slot name="empty" />
            </td>
          </tr>
        </tbody>

        <tbody v-else class="ui-datatable-tbody">
          <tr
            v-for="entry in tableRowEntries"
            :key="entry.key"
            class="ui-datatable-tr"
            :class="{ 'ui-datatable-tr--expansion': entry.kind === 'expansion' }"
            :data-selected="entry.kind === 'row' && isSelected(entry.row) ? '' : undefined"
            @click="entry.kind === 'row' && onRowClick(entry.row, $event)"
          >
            <template v-if="entry.kind === 'row'">
              <td
                v-if="selectColumnRendered"
                class="ui-datatable-td ui-datatable-td--select"
                :class="{ 'ui-datatable-td--frozen': frozenColumns > 0 }"
                :style="utilityFrozenStyle('select')"
              >
                <Checkbox
                  v-if="!single"
                  :model-value="isSelected(entry.row)"
                  aria-label="Select row"
                  @update:model-value="() => toggleSelect(entry.row)"
                />
                <Radio v-else :value="getRowKey(entry.row)" aria-label="Select row" />
              </td>
              <td
                v-if="expansionColumnRendered"
                class="ui-datatable-td ui-datatable-td--expand"
                :class="{ 'ui-datatable-td--frozen': frozenColumns > 0 }"
                :style="utilityFrozenStyle('expand')"
              >
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  type="button"
                  :aria-label="isExpanded(entry.row) ? 'Collapse row' : 'Expand row'"
                  @click="toggleExpand(entry.row)"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    aria-hidden="true"
                    class="ui-datatable-expand-chevron"
                    :data-state="isExpanded(entry.row) ? 'open' : 'closed'"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </Button>
              </td>
              <td
                v-for="(col, colIndex) in columns"
                :key="colIndex"
                class="ui-datatable-td"
                :class="{
                  'ui-datatable-td--frozen': isFrozenColumn(colIndex),
                  'ui-datatable-td--frozen-end': colIndex === frozenColumns - 1,
                }"
                :style="columnFrozenStyle(colIndex)"
                :data-label="col.label ?? String(col.field)"
              >
                <component
                  :is="col.cellSlot"
                  v-if="col.cellSlot"
                  :row="entry.row"
                  :value="entry.row[col.field]"
                />
                <template v-else>{{ entry.row[col.field] }}</template>
              </td>
            </template>
            <td v-else class="ui-datatable-td ui-datatable-td--expansion" :colspan="colCount">
              <slot name="expansion" :row="entry.row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="$slots.footer" class="ui-datatable-footer">
      <slot
        name="footer"
        :data="sortedData"
        :page="currentPage"
        :page-count="totalPages"
        :total="sortedData.length"
      />
    </div>

    <!-- display:none keeps Column children mounted for registration without rendering them -->
    <div style="display: none" aria-hidden="true">
      <slot name="columns" :Column="Column" :column-data="data" />
    </div>
  </div>
</template>

<!-- Slot-based: columns register via provide/inject, no config prop. Generic inference: `T` inferred from `:data` binding.
     No virtualization or row transitions here — consumers own motion-v usage in slots without conflicts.
     Pagination (rows/page): array slicing, internal; DataTable provides state to #footer slot.
     Single-select mode reuses Radio via direct injection (RadioGroup's wrapper incompatible here).
     Resize drag is direct manipulation per pointermove frame.
     frozenColumns: table-level math for cumulative offsets, since Column can't know what precedes it.
     Expansion: full-width row per `Ref<Set<...>>`, collapsed in stacked mode (no toggle). -->
<script setup lang="ts" generic="T extends Record<string, any>">
import './DataTable.css'
import {
  computed,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  provide,
  reactive,
  ref,
  useId,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrWindow } from '../../ssr'
import ColumnImpl from '../Column.vue'
import Checkbox from '../Checkbox.vue'
import Radio from '../Radio.vue'
import Button from '../Button/Button.vue'
import { radioGroupKey } from '../RadioGroup.vue'
import { provideDataTableContext } from '../../composables/useDataTableContext'
import type { RegisteredColumn } from '../../composables/useDataTableContext'

const props = withDefaults(
  defineProps<{
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
    resizableColumns?: boolean
    /** Freezes the first N columns sticky-left against horizontal scroll. */
    frozenColumns?: number
    /** Rows per page. Default: all rows render. Set: internal slicing; pair with `v-model:page`. */
    rows?: number
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
  },
)

const emit = defineEmits<{
  /** Fires when selection changes, with resolved row objects (not raw keys). */
  'update:selection': [rows: T[]]
  /** A click anywhere on a row outside its interactive descendants. */
  'row-click': [row: T]
}>()

const page = defineModel<number>('page', { default: 1 })

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

function resortColumnsByDom() {
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
const expansionColumnRendered = computed(() => !!slots.expansion && !stacked.value)
const colCount = computed(() => {
  let count = columns.value.length
  if (selectColumnRendered.value) count++
  if (expansionColumnRendered.value) count++
  return Math.max(count, 1)
})

const sort = reactive({ field: null, dir: null }) as {
  field: keyof T | null
  dir: 'asc' | 'desc' | null
}
function toggleSort(field: keyof T) {
  if (sort.field !== field) {
    sort.field = field
    sort.dir = 'asc'
  } else if (sort.dir === 'asc') {
    sort.dir = 'desc'
  } else {
    sort.field = null
    sort.dir = null
  }
}
function sortAriaValue(col: RegisteredColumn<T>): 'ascending' | 'descending' | 'none' {
  if (sort.field !== col.field || !sort.dir) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}
function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1
  return String(a).localeCompare(String(b))
}
const sortedData = computed(() => {
  const { field, dir } = sort
  if (!field || !dir) return props.data
  const direction = dir === 'asc' ? 1 : -1
  return [...props.data].sort((a, b) => compareValues(a[field], b[field]) * direction)
})

// Unset `rows` (the default): `totalPages` is always 1 and `pagedData` is
// always `sortedData` verbatim — zero behavior change for every existing
// consumer.
const totalPages = computed(() =>
  props.rows ? Math.max(1, Math.ceil(sortedData.value.length / props.rows)) : 1,
)
const currentPage = computed(() => Math.min(Math.max(page.value, 1), totalPages.value))
const pagedData = computed(() => {
  if (!props.rows) return sortedData.value
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

interface TableRowEntry {
  kind: 'row' | 'expansion'
  row: T
  key: string
}
const tableRowEntries = computed<TableRowEntry[]>(() => {
  const entries: TableRowEntry[] = []
  for (const row of pagedData.value) {
    const key = String(getRowKey(row))
    entries.push({ kind: 'row', row, key })
    if (slots.expansion && (stacked.value || isExpanded(row))) {
      entries.push({ kind: 'expansion', row, key: `${key}-expansion` })
    }
  }
  return entries
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
function isFrozenColumn(colIndex: number): boolean {
  return props.frozenColumns > 0 && colIndex < props.frozenColumns
}
const theadRow = useTemplateRef<HTMLElement>('theadRow')
const frozenOffsets = ref<number[]>([])
function recomputeFrozenOffsets() {
  if (props.frozenColumns <= 0) {
    if (frozenOffsets.value.length > 0) frozenOffsets.value = []
    return
  }
  const row = theadRow.value
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
onMounted(recomputeFrozenOffsets)
onUpdated(recomputeFrozenOffsets)
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !theadRow.value) return
  resizeObserver = new ResizeObserver(() => recomputeFrozenOffsets())
  resizeObserver.observe(theadRow.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

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
