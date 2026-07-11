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
    field: keyof T
    label?: string
    sortable?: boolean
    width?: string | number
    /** Unset (default) inherits DataTable's `resizableColumns`; `true`/`false` overrides per-column. */
    resizable?: boolean
    /** Type-inference anchor only. Bind here (`<Column :data="items" ...>`) so other props infer correctly against `T`. */
    data?: T[]
  }>(),
  {
    resizable: undefined,
  },
)

defineSlots<{
  cell?: (p: { row: T; value: T[keyof T] }) => any
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
