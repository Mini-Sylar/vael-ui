<template>
  <output data-testid="row-click-count">{{ rowClickCount }}</output>
  <output data-testid="last-clicked">{{ lastClicked }}</output>
  <output data-testid="selection-change-count">{{ selectionChangeRows.length }}</output>
  <output data-testid="exposed-el">{{ table?.el ? 'yes' : 'no' }}</output>
  <output data-testid="sort-field">{{ sort.field ?? '' }}</output>
  <output data-testid="sort-dir">{{ sort.dir ?? '' }}</output>
  <output data-testid="column-order">{{ columnOrder.join(',') }}</output>
  <output data-testid="drop-error-count">{{ dropErrorCount }}</output>

  <DataTable
    ref="table"
    v-model:page="page"
    v-model:sort="sort"
    :data="data"
    row-key="id"
    :loading="loading"
    :selectable="builtinSelectable"
    :selection-mode="selectionMode"
    :single="single"
    :scroll-height="scrollHeight"
    :stacked-breakpoint="stackedBreakpoint"
    :rows="rows"
    :size="size"
    :striped-rows="stripedRows"
    :show-gridlines="showGridlines"
    :resizable-columns="resizableColumns"
    :frozen-columns="frozenColumns"
    :manual-sort="manualSort"
    :lazy="lazy"
    :total="total"
    :motion-css="motionCss"
    :reorderable-columns="reorderableColumns"
    :column-grip-visibility="columnGripVisibility"
    :can-drop="canDrop"
    :before-drop="beforeDrop"
    :preview-mode="previewMode"
    @column-reorder="columnOrder = $event as string[]"
    @update:selection="onSelectionChange"
    @row-click="onRowClick"
    @drop-error="dropErrorCount++"
  >
    <template #columns="{ Column }">
      <component :is="Column" v-if="selectable" field="id" width="2rem">
        <template #cell="{ row }">
          <SelectCell :row="row" />
        </template>
      </component>
      <component :is="Column" field="name" label="Name" sortable width="8rem" />
      <component :is="Column" field="age" label="Age" sortable width="6rem" />
      <component :is="Column" v-if="showStatusColumn" field="status" label="Status" width="8rem">
        <template #cell="{ row }">
          <span data-testid="status-cell">{{ row.status.toUpperCase() }}</span>
        </template>
        <template #header="{ column }">
          <span data-testid="status-header">{{ column.label }}*</span>
        </template>
      </component>
    </template>

    <template #toolbar="{ selected, count }">
      <output data-testid="toolbar-count">{{ count }}</output>
      <output data-testid="toolbar-selected">{{ selected.size }}</output>
    </template>

    <template #loading>
      <span data-testid="loading-slot">Loading…</span>
    </template>

    <template #empty>
      <span data-testid="empty-slot">Nothing here</span>
    </template>

    <template #footer="{ data: sortedData, page: footerPage, pageCount, total }">
      <output data-testid="footer-count">{{ sortedData.length }}</output>
      <output data-testid="footer-page">{{ footerPage }}</output>
      <output data-testid="footer-page-count">{{ pageCount }}</output>
      <output data-testid="footer-total">{{ total }}</output>
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { defineComponent, h, shallowRef, useTemplateRef } from 'vue'
import DataTable from '../../src/components/DataTable/DataTable.vue'
import { useDataTableContext } from '../../src/composables/useDataTableContext'
import type { SortableDropDetails } from '../../src/composables/useSortable'

interface Person {
  id: string
  name: string
  age: number
  status: string
}

const props = withDefaults(
  defineProps<{
    rowCount?: number
    loading?: boolean
    /** Drives the MANUAL selection-composition pattern (a <Column> using
     * `SelectCell` below, via useDataTableContext directly) — kept separate
     * from `builtinSelectable` so both escape hatches stay independently
     * testable. */
    selectable?: boolean
    /** Drives DataTable's own built-in `selectable` prop (Task 1). */
    builtinSelectable?: boolean
    selectionMode?: 'checkbox' | 'row'
    single?: boolean
    showStatusColumn?: boolean
    scrollHeight?: string
    stackedBreakpoint?: string
    rows?: number
    initialPage?: number
    size?: 'sm' | 'md' | 'lg'
    stripedRows?: boolean
    showGridlines?: boolean
    resizableColumns?: boolean
    frozenColumns?: number
    manualSort?: boolean
    lazy?: boolean
    total?: number
    motionCss?: boolean
    reorderableColumns?: boolean
    columnGripVisibility?: 'hover' | 'always'
    canDrop?: (details: SortableDropDetails) => boolean
    beforeDrop?: (details: SortableDropDetails) => boolean | Promise<boolean>
    previewMode?: 'element' | 'clone'
  }>(),
  {
    rowCount: 4,
    loading: false,
    selectable: false,
    builtinSelectable: false,
    selectionMode: 'checkbox',
    single: false,
    showStatusColumn: true,
    initialPage: 1,
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
  },
)

const NAMES = ['Alice', 'Bob', 'Charlie', 'Dana', 'Eve', 'Frank', 'Grace', 'Heidi']
const data: Person[] = Array.from({ length: props.rowCount }, (_, i) => ({
  id: `p${i}`,
  name: i < NAMES.length ? NAMES[i] : `Person ${i}`,
  age: 20 + ((i * 7) % 40),
  status: i % 2 === 0 ? 'active' : 'inactive',
}))

const columnOrder = shallowRef<string[]>([])
const page = shallowRef(props.initialPage)
const sort = shallowRef<{ field: keyof Person | null; dir: 'asc' | 'desc' | null }>({
  field: null,
  dir: null,
})

// A real component rendered through a <Column>'s own #cell slot, proving
// the documented composition pattern (see useDataTableContext.ts's own doc
// comment and DataTableDemo.vue): this component never receives context as
// a prop — it calls `useDataTableContext()` itself, and reaches DataTable's
// `provide()` only because DataTable invokes this #cell slot from ITS OWN
// render (`<component :is="col.cellSlot">`), making this a real descendant
// of DataTable in the component tree.
const SelectCell = defineComponent({
  props: { row: { type: Object as () => Person, required: true } },
  setup(cellProps) {
    const ctx = useDataTableContext<Person>()
    return () =>
      h('input', {
        type: 'checkbox',
        'data-testid': `select-${cellProps.row.id}`,
        checked: ctx.isSelected(cellProps.row),
        onChange: () => ctx.toggleSelect(cellProps.row),
      })
  },
})

const dropErrorCount = shallowRef(0)
const rowClickCount = shallowRef(0)
const lastClicked = shallowRef('')
const selectionChangeRows = shallowRef<Person[]>([])

function onRowClick(row: Person) {
  rowClickCount.value++
  lastClicked.value = row.name
}
function onSelectionChange(rows: Person[]) {
  selectionChangeRows.value = rows
}

const table = useTemplateRef('table')
defineExpose({ table, page, sort, columnOrder })
</script>
