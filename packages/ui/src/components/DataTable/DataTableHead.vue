<template>
  <thead class="ui-datatable-thead">
    <tr ref="rowEl" class="ui-datatable-tr">
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
          :aria-label="messages.dataTable.selectAll"
          @update:model-value="onToggleSelectAll"
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
        :data-column-field="String(col.field)"
        :data-dragging="draggingColumn === col.field || undefined"
        :aria-roledescription="isColumnReorderable(col) ? 'draggable column' : undefined"
        @pointerdown="isColumnReorderable(col) && onColumnPointerdown($event, col.field as string)"
        @click.capture="onHeaderClickCapture"
      >
        <div
          class="ui-datatable-th-inner"
          :class="{ 'ui-datatable-th-inner--draggable': isColumnReorderable(col) }"
        >
          <span
            v-if="isColumnReorderable(col)"
            class="ui-datatable-th-grip"
            :data-visibility="columnGripVisibility"
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
              <circle cx="6" cy="3" r="1.25" />
              <circle cx="10" cy="3" r="1.25" />
              <circle cx="6" cy="8" r="1.25" />
              <circle cx="10" cy="8" r="1.25" />
              <circle cx="6" cy="13" r="1.25" />
              <circle cx="10" cy="13" r="1.25" />
            </svg>
          </span>
          <component :is="col.headerSlot" v-if="col.headerSlot" :column="col" />
          <button
            v-else-if="col.sortable"
            type="button"
            class="ui-datatable-sort-button"
            @click="onToggleSort(col.field)"
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
        </div>
        <span
          v-if="isColumnResizable(col)"
          class="ui-datatable-resize-handle"
          aria-hidden="true"
          @pointerdown="onResizePointerdown(col, $event)"
        ></span>
      </th>
    </tr>
  </thead>
</template>

<!-- Internal, DataTable-only: written once and rendered from either of
     DataTable.vue's two table structures — see DataTableBody.vue's own
     header comment for why. Exposes `rowEl` so the parent's frozenColumns
     offset measurement (which needs the real <th> elements) keeps working
     regardless of which table currently owns this header. -->
<script setup lang="ts" generic="T extends Record<string, any>">
import { useTemplateRef } from 'vue'
import Checkbox from '../Checkbox/Checkbox.vue'
import type { RegisteredColumn } from '../../composables/useDataTableContext'
import { useUiMessages } from '../../messages'

const messages = useUiMessages()

const props = defineProps<{
  selectColumnRendered: boolean
  expansionColumnRendered: boolean
  columns: RegisteredColumn<T>[]
  frozenColumns: number
  single: boolean
  selectAllState: { all: boolean; some: boolean }
  sort: { field: keyof T | null; dir: 'asc' | 'desc' | null }
  isFrozenColumn: (colIndex: number) => boolean
  columnFrozenStyle: (colIndex: number) => Record<string, string> | undefined
  utilityFrozenStyle: (kind: 'select' | 'expand') => Record<string, string> | undefined
  columnStyle: (col: RegisteredColumn<T>) => Record<string, string> | undefined
  isColumnResizable: (col: RegisteredColumn<T>) => boolean
  sortAriaValue: (col: RegisteredColumn<T>) => 'ascending' | 'descending' | 'none'
  onToggleSelectAll: () => void
  onToggleSort: (field: keyof T) => void
  onResizePointerdown: (col: RegisteredColumn<T>, event: PointerEvent) => void
  isColumnReorderable: (col: RegisteredColumn<T>) => boolean
  columnGripVisibility: 'hover' | 'always'
  draggingColumn: string | number | null
  onColumnPointerdown: (event: PointerEvent, field: string | number) => void
  consumeColumnClick: () => boolean
}>()

function onHeaderClickCapture(event: MouseEvent) {
  // A completed drag is followed by a click; without swallowing it, dropping a
  // column also toggles its sort.
  if (!props.consumeColumnClick()) return
  event.preventDefault()
  event.stopPropagation()
}

const rowEl = useTemplateRef<HTMLElement>('rowEl')
defineExpose({ rowEl })
</script>
