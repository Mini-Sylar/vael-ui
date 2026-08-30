import { inject, provide } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export interface RegisteredColumn<T> {
  field: keyof T
  label?: string
  sortable?: boolean
  width?: string | number
  /** Per-column override for DataTable's `resizableColumns` — `undefined`
   * inherits the table-level setting (see DataTable.vue's `isColumnResizable`). */
  resizable?: boolean
  /** Per-column override for DataTable's `reorderableColumns` — `undefined`
   * inherits the table-level setting. Set `false` to pin a column in place. */
  reorderable?: boolean
  cellSlot?: (p: { row: T; value: T[keyof T] }) => unknown
  headerSlot?: (p: { column: RegisteredColumn<T> }) => unknown
  /** Hidden marker; used to resort columns into DOM order after updates. */
  el?: Element | null
}

/** Provide/inject contract for compound DataTable+Column; lifted to module for generic-scoped access. */
export interface DataTableContext<T> {
  registerColumn: (col: RegisteredColumn<T>) => void
  unregisterColumn: (col: RegisteredColumn<T>) => void
  sort: Ref<{ field: keyof T | null; dir: 'asc' | 'desc' | null }>
  toggleSort: (field: keyof T) => void
  selected: Ref<Set<string | number>>
  toggleSelect: (row: T) => void
  isSelected: (row: T) => boolean
  getRowKey: (row: T) => string | number
}

const dataTableKey: InjectionKey<DataTableContext<any>> = Symbol('ui-data-table')

export function provideDataTableContext<T>(ctx: DataTableContext<T>): void {
  provide(dataTableKey, ctx)
}

export function useDataTableContext<T>(): DataTableContext<T> {
  const ctx = inject(dataTableKey)
  if (!ctx) {
    throw new Error("useDataTableContext() must be called inside a <DataTable>'s tree.")
  }
  return ctx as DataTableContext<T>
}
