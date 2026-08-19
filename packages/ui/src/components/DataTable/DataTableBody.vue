<template>
  <tbody v-if="loading" class="ui-datatable-tbody">
    <tr class="ui-datatable-tr">
      <td class="ui-datatable-td ui-datatable-td--loading" :colspan="colCount">
        <slot name="loading" />
      </td>
    </tr>
  </tbody>

  <tbody v-else-if="isEmpty" class="ui-datatable-tbody">
    <tr class="ui-datatable-tr">
      <td class="ui-datatable-td ui-datatable-td--empty" :colspan="colCount">
        <slot name="empty" />
      </td>
    </tr>
  </tbody>

  <!-- Virtualized: real in-flow <tr>s for the visible window only, bounded
       by two spacer rows — an absolutely-positioned <tr> would blockify and
       break column alignment with the header, so this can't reuse the
       absolute-positioning approach Select's own listbox uses. -->
  <tbody v-else-if="virtualizeActive" class="ui-datatable-tbody">
    <tr
      v-if="virtualItems.length > 0"
      class="ui-datatable-tr ui-datatable-tr--spacer"
      :style="{ blockSize: `${topSpacerHeight}px` }"
      aria-hidden="true"
    >
      <td :colspan="colCount" class="ui-datatable-td ui-datatable-td--spacer"></td>
    </tr>
    <!-- Cell markup here must stay identical to the non-virtualized tbody below. -->
    <tr
      v-for="virtualRow in virtualItems"
      :key="tableRowEntries[virtualRow.index]!.key"
      :ref="(el) => measureRow(virtualRow.index, el as HTMLElement | null)"
      :data-virtual-index="virtualRow.index"
      class="ui-datatable-tr"
      :class="{
        'ui-datatable-tr--expansion': tableRowEntries[virtualRow.index]!.kind === 'expansion',
        'ui-datatable-tr--clickable':
          selectableRows && tableRowEntries[virtualRow.index]!.kind === 'row',
      }"
      :data-selected="
        tableRowEntries[virtualRow.index]!.kind === 'row' &&
        isSelected(tableRowEntries[virtualRow.index]!.row)
          ? ''
          : undefined
      "
      @click="
        tableRowEntries[virtualRow.index]!.kind === 'row' &&
        onRowClick(tableRowEntries[virtualRow.index]!.row, $event)
      "
    >
      <template v-if="tableRowEntries[virtualRow.index]!.kind === 'row'">
        <td
          v-if="selectColumnRendered"
          class="ui-datatable-td ui-datatable-td--select"
          :class="{ 'ui-datatable-td--frozen': frozenColumns > 0 }"
          :style="utilityFrozenStyle('select')"
        >
          <Checkbox
            v-if="!single"
            :model-value="isSelected(tableRowEntries[virtualRow.index]!.row)"
            :aria-label="messages.dataTable.selectRow"
            @update:model-value="() => onToggleSelect(tableRowEntries[virtualRow.index]!.row)"
          />
          <Radio
            v-else
            :value="getRowKey(tableRowEntries[virtualRow.index]!.row)"
            :aria-label="messages.dataTable.selectRow"
          />
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
            :aria-label="
              isExpanded(tableRowEntries[virtualRow.index]!.row)
                ? messages.dataTable.collapseRow
                : messages.dataTable.expandRow
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
          v-for="(col, colIndex) in columns"
          :key="colIndex"
          class="ui-datatable-td"
          :class="{
            'ui-datatable-td--frozen': isFrozenColumn(colIndex),
            'ui-datatable-td--frozen-end': colIndex === frozenColumns - 1,
          }"
          :style="[columnStyle(col), columnFrozenStyle(colIndex)]"
          :data-label="col.label ?? String(col.field)"
        >
          <component
            :is="col.cellSlot"
            v-if="col.cellSlot"
            :row="tableRowEntries[virtualRow.index]!.row"
            :value="tableRowEntries[virtualRow.index]!.row[col.field]"
          />
          <template v-else>{{ tableRowEntries[virtualRow.index]!.row[col.field] }}</template>
        </td>
      </template>
      <td v-else class="ui-datatable-td ui-datatable-td--expansion" :colspan="colCount">
        <div class="ui-datatable-expansion-rows">
          <div class="ui-datatable-expansion-inner">
            <slot name="expansion" :row="tableRowEntries[virtualRow.index]!.row" />
          </div>
        </div>
      </td>
    </tr>
    <tr
      v-if="virtualItems.length > 0"
      class="ui-datatable-tr ui-datatable-tr--spacer"
      :style="{ blockSize: `${bottomSpacerHeight}px` }"
      aria-hidden="true"
    >
      <td :colspan="colCount" class="ui-datatable-td ui-datatable-td--spacer"></td>
    </tr>
  </tbody>

  <TransitionGroup
    v-else
    tag="tbody"
    name="ui-datatable-row"
    :css="motionCss"
    class="ui-datatable-tbody"
    :data-motion="motionCss && rowMotionReady ? undefined : 'off'"
    @before-enter="beforeEnterHook"
    @before-leave="beforeLeaveHook"
    @enter="rowEnterHook"
    @leave="rowLeaveHook"
  >
    <tr
      v-for="entry in tableRowEntries"
      :key="entry.key"
      class="ui-datatable-tr"
      :class="{
        'ui-datatable-tr--expansion': entry.kind === 'expansion',
        'ui-datatable-tr--clickable': selectableRows && entry.kind === 'row',
      }"
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
            :aria-label="messages.dataTable.selectRow"
            @update:model-value="() => onToggleSelect(entry.row)"
          />
          <Radio v-else :value="getRowKey(entry.row)" :aria-label="messages.dataTable.selectRow" />
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
            :aria-label="
              isExpanded(entry.row) ? messages.dataTable.collapseRow : messages.dataTable.expandRow
            "
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
          v-for="(col, colIndex) in columns"
          :key="colIndex"
          class="ui-datatable-td"
          :class="{
            'ui-datatable-td--frozen': isFrozenColumn(colIndex),
            'ui-datatable-td--frozen-end': colIndex === frozenColumns - 1,
          }"
          :style="[columnStyle(col), columnFrozenStyle(colIndex)]"
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
        <div class="ui-datatable-expansion-rows">
          <div class="ui-datatable-expansion-inner">
            <slot name="expansion" :row="entry.row" />
          </div>
        </div>
      </td>
    </tr>
  </TransitionGroup>
</template>

<!-- Internal, DataTable-only: the tbody markup written once and rendered from
     either of DataTable.vue's two table structures (a single combined table
     when `scrollHeight` is unset, or the body-only table of the split
     head/body-scroll layout when it's set) — avoiding a second copy of this
     whole block. Not in components/internal/ since only DataTable uses it. -->
<script setup lang="ts" generic="T extends Record<string, any>">
import Checkbox from '../Checkbox/Checkbox.vue'
import Radio from '../Radio/Radio.vue'
import Button from '../Button/Button.vue'
import type { RegisteredColumn } from '../../composables/useDataTableContext'
import { computed, TransitionGroup } from 'vue'
import type { VirtualRow } from '../../composables/useVirtualizer'
import { useUiMessages } from '../../messages'

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
  measureRow: (index: number, el: HTMLElement | null) => void
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
  onToggleSelect: (row: T) => void
  onToggleExpand: (row: T) => void
  onRowClick: (row: T, event: MouseEvent) => void
  motionCss: boolean
  /** False while DataTable's own post-mount layout measurements are still
   * settling — disables just the row-move CSS transition for that render
   * (see DataTable.vue's own comment), not the enter/leave hooks. */
  rowMotionReady: boolean
  onRowEnter: (el: Element, done: () => void) => void
  onRowLeave: (el: Element, done: () => void) => void
}>()

defineSlots<{
  loading(): any
  empty(): any
  expansion(props: { row: T }): any
}>()

const messages = useUiMessages()

// Same shape as Toaster's own enterHook/leaveHook — a JS hook and Vue's own
// CSS end-detection can't coexist, so this only wires one when motionCss is false.
const rowEnterHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => props.onRowEnter(el, done),
)
const rowLeaveHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => props.onRowLeave(el, done),
)

// grid-template-rows: 1fr/0fr interpolates the *fr* value linearly, not the resulting
// pixel height — most of the visible shrink/grow happens in a short early burst, then
// the numeric transition keeps running for its full duration with barely anything
// visibly changing, reading as a stall. Measuring a real px value first (below) and
// transitioning max-block-size instead interpolates the actual height linearly. Only
// motionCss's own CSS-driven transition needs this — skipped when false, since the
// consumer owns the whole animation via row-enter/row-leave.
function beforeEnterHook(el: Element) {
  if (!props.motionCss) return
  const wrap = (el as HTMLElement).querySelector<HTMLElement>('.ui-datatable-expansion-rows')
  if (!wrap) return
  wrap.style.maxBlockSize = '0px'
  requestAnimationFrame(() => {
    wrap.style.maxBlockSize = `${wrap.scrollHeight}px`
  })
}
function beforeLeaveHook(el: Element) {
  if (!props.motionCss) return
  const wrap = (el as HTMLElement).querySelector<HTMLElement>('.ui-datatable-expansion-rows')
  if (!wrap) return
  wrap.style.maxBlockSize = `${wrap.scrollHeight}px`
  void wrap.offsetHeight // force a reflow so the browser registers the starting value
  requestAnimationFrame(() => {
    wrap.style.maxBlockSize = '0px'
  })
}
</script>
