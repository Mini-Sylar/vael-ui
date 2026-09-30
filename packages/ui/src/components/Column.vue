<template>
  <i ref="markerEl" class="ui-column-marker" style="display: none" aria-hidden="true"></i>
</template>

<!-- Hidden marker: enables DataTable to read column's DOM position; props/slots exposed via getters for reactivity -->
<script setup lang="ts" generic="T extends Record<string, any>">
import { onBeforeUnmount, useSlots, useTemplateRef } from 'vue'
import { useDataTableContext } from '../composables/useDataTableContext'
import type { RegisteredColumn } from '../composables/useDataTableContext'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Row key this column reads its values from. */
    field: keyof T
    /** Header text. Falls back to `field`. */
    label?: string
    /** Makes the header a button that cycles ascending, descending and unsorted. */
    sortable?: boolean
    /** Column width as a CSS length. Numbers are pixels. */
    width?: string | number
    /** Unset, inherits DataTable's `resizableColumns`; `true` or `false` overrides it for this column. */
    resizable?: boolean
    /** Unset, inherits DataTable's `reorderableColumns`; `false` pins this column in place. */
    reorderable?: boolean
    /** Type-inference anchor only. Bind it (`<Column :data="items">`) so other props infer against `T`. */
    data?: T[]
  }>(),
  {
    resizable: undefined,
    reorderable: undefined,
  },
)

defineSlots<{
  /** Custom cell content for each row. */
  cell?: (p: { row: T; value: T[keyof T] }) => any
  /** Replaces the header content, including the sort button of a `sortable` column. */
  header?: (p: { column: RegisteredColumn<T> }) => any
}>()

const slots = useSlots()
const ctx = useDataTableContext<T>()
const markerEl = useTemplateRef<HTMLElement>('markerEl')

const columnDef: RegisteredColumn<T> = {
  get field() {
    return props.field
  },
  get label() {
    return props.label
  },
  get sortable() {
    return props.sortable
  },
  get width() {
    return props.width
  },
  get reorderable() {
    return props.reorderable
  },
  get resizable() {
    return props.resizable
  },
  get cellSlot() {
    return slots.cell
  },
  get headerSlot() {
    return slots.header
  },
  get el() {
    return markerEl.value
  },
}

ctx.registerColumn(columnDef)
onBeforeUnmount(() => ctx.unregisterColumn(columnDef))
</script>
