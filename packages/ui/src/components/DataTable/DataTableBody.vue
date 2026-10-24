<template>
  <tbody :role="roles.group" v-if="loading" :class="tbodyPart.class" :style="tbodyPart.style">
    <tr :role="roles.row" :class="trPart().class" :style="trPart().style">
      <td
        :role="roles.cell"
        :class="tdPart('ui-datatable-td--loading').class"
        :style="tdPart().style"
        :colspan="colCount"
      >
        <slot name="loading" />
      </td>
    </tr>
  </tbody>

  <tbody :role="roles.group" v-else-if="isEmpty" :class="tbodyPart.class" :style="tbodyPart.style">
    <tr :role="roles.row" :class="trPart().class" :style="trPart().style">
      <td
        :role="roles.cell"
        :class="tdPart('ui-datatable-td--empty').class"
        :style="tdPart().style"
        :colspan="colCount"
      >
        <slot name="empty" />
      </td>
    </tr>
  </tbody>

  <!-- Spacer rows, not absolute rows: an absolute <tr> would break column alignment. -->
  <tbody
    :role="roles.group"
    v-else-if="virtualizeActive"
    :class="tbodyPart.class"
    :style="tbodyPart.style"
  >
    <tr
      :role="roles.row"
      v-if="virtualItems.length > 0"
      :class="trPart('ui-datatable-tr--spacer').class"
      :style="[trPart().style, { blockSize: `${topSpacerHeight}px` }]"
      aria-hidden="true"
    >
      <td
        :role="roles.cell"
        :colspan="colCount"
        :class="tdPart('ui-datatable-td--spacer').class"
        :style="tdPart().style"
      ></td>
    </tr>
    <!-- Cell markup here must stay identical to the non-virtualized tbody below. -->
    <tr
      :role="roles.row"
      v-for="virtualRow in virtualItems"
      :key="tableRowEntries[virtualRow.index]!.key"
      :ref="measureRow(virtualRow.index)"
      :data-virtual-index="virtualRow.index"
      :class="
        trPart(
          tableRowEntries[virtualRow.index]!.kind === 'expansion' && 'ui-datatable-tr--expansion',
          selectableRows &&
            tableRowEntries[virtualRow.index]!.kind === 'row' &&
            'ui-datatable-tr--clickable',
        ).class
      "
      :style="trPart().style"
      :data-selected="
        tableRowEntries[virtualRow.index]!.kind === 'row' &&
        isSelected(tableRowEntries[virtualRow.index]!.row)
          ? ''
          : undefined
      "
      :data-row-key="tableRowEntries[virtualRow.index]!.key"
      :id="
        tableRowEntries[virtualRow.index]!.kind === 'expansion'
          ? expansionId(tableRowEntries[virtualRow.index]!.row)
          : undefined
      "
      :tabindex="
        tableRowEntries[virtualRow.index]!.kind === 'row'
          ? rowTabIndex(tableRowEntries[virtualRow.index]!.row)
          : undefined
      "
      :aria-selected="
        tableRowEntries[virtualRow.index]!.kind === 'row'
          ? ariaSelected(tableRowEntries[virtualRow.index]!.row)
          : undefined
      "
      @click="
        tableRowEntries[virtualRow.index]!.kind === 'row' &&
        onRowClick(tableRowEntries[virtualRow.index]!.row, $event)
      "
      @focus="
        tableRowEntries[virtualRow.index]!.kind === 'row' &&
        onRowFocus(tableRowEntries[virtualRow.index]!.row, $event)
      "
      @keydown="
        tableRowEntries[virtualRow.index]!.kind === 'row' &&
        onRowKeydown(tableRowEntries[virtualRow.index]!.row, $event)
      "
    >
      <template v-if="tableRowEntries[virtualRow.index]!.kind === 'row'">
        <td
          :role="roles.cell"
          v-if="selectColumnRendered"
          :class="
            tdPart('ui-datatable-td--select', frozenColumns > 0 && 'ui-datatable-td--frozen').class
          "
          :style="[tdPart().style, utilityFrozenStyle('select')]"
        >
          <Checkbox
            v-if="!single"
            :model-value="isSelected(tableRowEntries[virtualRow.index]!.row)"
            :aria-labelledby="`${selectLabelId} ${rowLabelId(tableRowEntries[virtualRow.index]!.row)}`"
            @update:model-value="() => onToggleSelect(tableRowEntries[virtualRow.index]!.row)"
          />
          <Radio
            v-else
            :value="getRowKey(tableRowEntries[virtualRow.index]!.row)"
            :aria-labelledby="`${selectLabelId} ${rowLabelId(tableRowEntries[virtualRow.index]!.row)}`"
          />
        </td>
        <td
          :role="roles.cell"
          v-if="expansionColumnRendered"
          :class="
            tdPart('ui-datatable-td--expand', frozenColumns > 0 && 'ui-datatable-td--frozen').class
          "
          :style="[tdPart().style, utilityFrozenStyle('expand')]"
        >
          <Button
            icon
            size="sm"
            variant="ghost"
            type="button"
            :aria-label="
              isExpanded(tableRowEntries[virtualRow.index]!.row)
                ? messages.dataTable.collapseRow
                : messages.dataTable.expandRow
            "
            :aria-expanded="isExpanded(tableRowEntries[virtualRow.index]!.row)"
            :aria-controls="
              isExpanded(tableRowEntries[virtualRow.index]!.row)
                ? expansionId(tableRowEntries[virtualRow.index]!.row)
                : undefined
            "
            @click="onToggleExpand(tableRowEntries[virtualRow.index]!.row)"
          >
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              aria-hidden="true"
              class="ui-datatable-expand-chevron"
              :data-state="isExpanded(tableRowEntries[virtualRow.index]!.row) ? 'open' : 'closed'"
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </Button>
        </td>
        <td
          :role="roles.cell"
          v-for="(col, colIndex) in columns"
          :key="String(col.field)"
          :class="
            tdPart(
              isFrozenColumn(colIndex) && 'ui-datatable-td--frozen',
              colIndex === frozenColumns - 1 && 'ui-datatable-td--frozen-end',
            ).class
          "
          :style="[tdPart().style, columnStyle(col), columnFrozenStyle(colIndex)]"
          :data-label="col.label ?? String(col.field)"
          :data-column-field="String(col.field)"
          :id="
            colIndex === 0 && selectColumnRendered
              ? rowLabelId(tableRowEntries[virtualRow.index]!.row)
              : undefined
          "
        >
          <component
            :is="col.cellRelay"
            v-if="col.cellRelay"
            :row="tableRowEntries[virtualRow.index]!.row"
            :value="tableRowEntries[virtualRow.index]!.row[col.field]"
          />
          <template v-else>{{ tableRowEntries[virtualRow.index]!.row[col.field] }}</template>
        </td>
      </template>
      <td
        :role="roles.cell"
        v-else
        :class="tdPart('ui-datatable-td--expansion').class"
        :style="tdPart().style"
        :colspan="colCount"
      >
        <div :class="expansionRowPart.class" :style="expansionRowPart.style">
          <div :class="expansionContentPart.class" :style="expansionContentPart.style">
            <slot name="expansion" :row="tableRowEntries[virtualRow.index]!.row" />
          </div>
        </div>
      </td>
    </tr>
    <tr
      :role="roles.row"
      v-if="virtualItems.length > 0"
      :class="trPart('ui-datatable-tr--spacer').class"
      :style="[trPart().style, { blockSize: `${bottomSpacerHeight}px` }]"
      aria-hidden="true"
    >
      <td
        :role="roles.cell"
        :colspan="colCount"
        :class="tdPart('ui-datatable-td--spacer').class"
        :style="tdPart().style"
      ></td>
    </tr>
  </tbody>

  <TransitionGroup
    v-else
    tag="tbody"
    :role="roles.group"
    v-bind="rowsTransition"
    :class="tbodyPart.class"
    :style="tbodyPart.style"
    :data-motion="rowCss && rowMotionReady ? undefined : 'off'"
    @before-enter="beforeEnterHook"
    @after-enter="afterEnterHook"
    @before-leave="beforeLeaveHook"
  >
    <tr
      :role="roles.row"
      v-for="entry in tableRowEntries"
      :key="entry.key"
      :class="
        trPart(
          entry.kind === 'expansion' && 'ui-datatable-tr--expansion',
          selectableRows && entry.kind === 'row' && 'ui-datatable-tr--clickable',
        ).class
      "
      :style="trPart().style"
      :data-selected="entry.kind === 'row' && isSelected(entry.row) ? '' : undefined"
      :data-row-key="entry.key"
      :id="entry.kind === 'expansion' ? expansionId(entry.row) : undefined"
      :tabindex="entry.kind === 'row' ? rowTabIndex(entry.row) : undefined"
      :aria-selected="entry.kind === 'row' ? ariaSelected(entry.row) : undefined"
      @click="entry.kind === 'row' && onRowClick(entry.row, $event)"
      @focus="entry.kind === 'row' && onRowFocus(entry.row, $event)"
      @keydown="entry.kind === 'row' && onRowKeydown(entry.row, $event)"
    >
      <template v-if="entry.kind === 'row'">
        <td
          :role="roles.cell"
          v-if="selectColumnRendered"
          :class="
            tdPart('ui-datatable-td--select', frozenColumns > 0 && 'ui-datatable-td--frozen').class
          "
          :style="[tdPart().style, utilityFrozenStyle('select')]"
        >
          <Checkbox
            v-if="!single"
            :model-value="isSelected(entry.row)"
            :aria-labelledby="`${selectLabelId} ${rowLabelId(entry.row)}`"
            @update:model-value="() => onToggleSelect(entry.row)"
          />
          <Radio
            v-else
            :value="getRowKey(entry.row)"
            :aria-labelledby="`${selectLabelId} ${rowLabelId(entry.row)}`"
          />
        </td>
        <td
          :role="roles.cell"
          v-if="expansionColumnRendered"
          :class="
            tdPart('ui-datatable-td--expand', frozenColumns > 0 && 'ui-datatable-td--frozen').class
          "
          :style="[tdPart().style, utilityFrozenStyle('expand')]"
        >
          <Button
            icon
            size="sm"
            variant="ghost"
            type="button"
            :aria-label="
              isExpanded(entry.row) ? messages.dataTable.collapseRow : messages.dataTable.expandRow
            "
            :aria-expanded="isExpanded(entry.row)"
            :aria-controls="isExpanded(entry.row) ? expansionId(entry.row) : undefined"
            @click="onToggleExpand(entry.row)"
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
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </Button>
        </td>
        <td
          :role="roles.cell"
          v-for="(col, colIndex) in columns"
          :key="String(col.field)"
          :class="
            tdPart(
              isFrozenColumn(colIndex) && 'ui-datatable-td--frozen',
              colIndex === frozenColumns - 1 && 'ui-datatable-td--frozen-end',
            ).class
          "
          :style="[tdPart().style, columnStyle(col), columnFrozenStyle(colIndex)]"
          :data-label="col.label ?? String(col.field)"
          :data-column-field="String(col.field)"
          :id="colIndex === 0 && selectColumnRendered ? rowLabelId(entry.row) : undefined"
        >
          <component
            :is="col.cellRelay"
            v-if="col.cellRelay"
            :row="entry.row"
            :value="entry.row[col.field]"
          />
          <template v-else>{{ entry.row[col.field] }}</template>
        </td>
      </template>
      <td
        :role="roles.cell"
        v-else
        :class="tdPart('ui-datatable-td--expansion').class"
        :style="tdPart().style"
        :colspan="colCount"
      >
        <div :class="expansionRowPart.class" :style="expansionRowPart.style">
          <div :class="expansionContentPart.class" :style="expansionContentPart.style">
            <slot name="expansion" :row="entry.row" />
          </div>
        </div>
      </td>
    </tr>
  </TransitionGroup>
</template>

<!-- Internal: shared by DataTable's single and split table layouts. -->
<script setup lang="ts" generic="T extends Record<string, any>">
import Checkbox from '../Checkbox/Checkbox.vue'
import Radio from '../Radio/Radio.vue'
import Button from '../Button/Button.vue'
import type { RegisteredColumn } from '../../composables/useDataTableContext'
import { computed, TransitionGroup } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { VirtualRow } from '../../composables/useVirtualizer'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'

export interface TableRowEntry<T> {
  kind: 'row' | 'expansion'
  row: T
  key: string
}

const props = defineProps<{
  colCount: number
  columns: RegisteredColumn<T>[]
  loading: boolean
  isEmpty: boolean
  virtualizeActive: boolean
  tableRowEntries: TableRowEntry<T>[]
  virtualItems: VirtualRow[]
  topSpacerHeight: number
  bottomSpacerHeight: number
  measureRow: {
    (index: number, el: HTMLElement | null): void
    (index: number): (el: Element | ComponentPublicInstance | null) => void
  }
  selectColumnRendered: boolean
  expansionColumnRendered: boolean
  selectableRows: boolean
  frozenColumns: number
  single: boolean
  isFrozenColumn: (colIndex: number) => boolean
  columnFrozenStyle: (colIndex: number) => Record<string, string> | undefined
  utilityFrozenStyle: (kind: 'select' | 'expand') => Record<string, string> | undefined
  columnStyle: (col: RegisteredColumn<T>) => Record<string, string> | undefined
  isSelected: (row: T) => boolean
  getRowKey: (row: T) => string | number
  isExpanded: (row: T) => boolean
  selectable: boolean
  rowTabIndex: (row: T) => number | undefined
  onRowFocus: (row: T, event: FocusEvent) => void
  onRowKeydown: (row: T, event: KeyboardEvent) => void
  expansionId: (row: T) => string
  rowLabelId: (row: T) => string
  selectLabelId: string
  onToggleSelect: (row: T) => void
  onToggleExpand: (row: T) => void
  onRowClick: (row: T, event: MouseEvent) => void
  motion: boolean
  /** False until the first measurement render has passed; row move stays off. */
  rowMotionReady: boolean
  /** Your rows' motion (the motion system's TransitionGroup props), or none: the built-in CSS. */
  rowTransition?: Record<string, unknown>
  /** scrollHeight layout: head and body are separate tables joined by ARIA roles. */
  split: boolean
  ui?: Partial<{
    tbody: UiPartValue
    tr: UiPartValue
    td: UiPartValue
    expansionRow: UiPartValue
    expansionContent: UiPartValue
  }>
}>()

// In the split layout the tables are presentational and these roles rebuild one table.
// The scroll strip is the rowgroup, since a table can't hold a focusable div. Selectable, it's a grid.
const roles = computed(() =>
  props.split
    ? { group: 'presentation', row: 'row', cell: props.selectable ? 'gridcell' : 'cell' }
    : { group: undefined, row: undefined, cell: undefined },
)

const cx = useClassMerge()
const tbodyPart = computed(() => resolveUiPart(cx, props.ui?.tbody, 'ui-datatable-tbody'))
function trPart(...extra: (string | false | undefined)[]) {
  return resolveUiPart(cx, props.ui?.tr, 'ui-datatable-tr', ...extra)
}
function tdPart(...extra: (string | false | undefined)[]) {
  return resolveUiPart(cx, props.ui?.td, 'ui-datatable-td', ...extra)
}
const expansionRowPart = computed(() =>
  resolveUiPart(cx, props.ui?.expansionRow, 'ui-datatable-expansion-rows'),
)
const expansionContentPart = computed(() =>
  resolveUiPart(cx, props.ui?.expansionContent, 'ui-datatable-expansion-inner'),
)

defineSlots<{
  loading(): any
  empty(): any
  expansion(props: { row: T }): any
}>()

const messages = useUiMessages()

function ariaSelected(row: T): 'true' | 'false' | undefined {
  if (!props.selectable) return undefined
  return props.isSelected(row) ? 'true' : 'false'
}

// Move FLIP and leave transitions force a layout per row, so above this many rows they snap.
const ROW_MOTION_LIMIT = 150
const rowMotionFits = computed<{ count: number; fits: boolean }>((previous) => {
  const count = props.tableRowEntries.length
  return {
    count,
    fits: count <= ROW_MOTION_LIMIT && (previous?.count ?? 0) <= ROW_MOTION_LIMIT,
  }
})
const rowCss = computed(() => props.motion && rowMotionFits.value.fits)
// A change that keeps no row (a page change, new data) shows at once: every row fading in flashes.
const rowSwap = computed<{ keys: Set<string>; swap: boolean }>((previous) => {
  const keys = new Set(props.tableRowEntries.map((entry) => entry.key))
  const kept = previous ? [...keys].some((key) => previous.keys.has(key)) : true
  return { keys, swap: !kept && (previous?.keys.size ?? 0) > 0 }
})
const rowFade = computed(() => rowCss.value && !rowSwap.value.swap)

// Yours plays through the motion system, the built-in look through CSS; past the limit, neither.
const rowsTransition = computed(() =>
  props.rowTransition && rowMotionFits.value.fits
    ? props.rowTransition
    : { name: 'ui-datatable-row', css: rowFade.value },
)

// A px max-block-size, not 0fr/1fr rows: fr interpolates unevenly and reads as a stall.
function beforeEnterHook(el: Element) {
  if (!rowFade.value) return
  const wrap = (el as HTMLElement).querySelector<HTMLElement>('.ui-datatable-expansion-rows')
  if (!wrap) return
  wrap.style.maxBlockSize = '0px'
  requestAnimationFrame(() => {
    wrap.style.maxBlockSize = `${wrap.scrollHeight}px`
  })
}
// Released once open, so rows that grow later (async content) aren't clipped.
function afterEnterHook(el: Element) {
  const wrap = (el as HTMLElement).querySelector<HTMLElement>('.ui-datatable-expansion-rows')
  if (wrap) wrap.style.maxBlockSize = ''
}
function beforeLeaveHook(el: Element) {
  if (!rowFade.value) return
  const wrap = (el as HTMLElement).querySelector<HTMLElement>('.ui-datatable-expansion-rows')
  if (!wrap) return
  wrap.style.maxBlockSize = `${wrap.scrollHeight}px`
  void wrap.offsetHeight // force a reflow so the browser registers the starting value
  requestAnimationFrame(() => {
    wrap.style.maxBlockSize = '0px'
  })
}
</script>
