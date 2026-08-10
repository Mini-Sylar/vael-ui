<template>
  <output data-testid="exposed-el">{{ table?.el ? 'yes' : 'no' }}</output>
  <output data-testid="reach-end-count">{{ reachEndCount }}</output>
  <output data-testid="reach-start-count">{{ reachStartCount }}</output>

  <DataTable
    ref="table"
    :data="data"
    row-key="id"
    scroll-height="200px"
    :virtualize="virtualize"
    @reach-end="reachEndCount++"
    @reach-start="reachStartCount++"
  >
    <template #columns="{ Column }">
      <component :is="Column" field="name" label="Name" />
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import DataTable from '../../src/components/DataTable/DataTable.vue'

interface Row {
  id: string
  name: string
}

const props = withDefaults(
  defineProps<{
    rowCount?: number
    virtualize?: boolean | { itemSize?: number; overscan?: number; estimateSize?: number }
  }>(),
  { rowCount: 1000, virtualize: true },
)

// Reactive to `rowCount` — the reach-end re-arm test rerenders with a larger
// count and expects the same fixture instance to see genuinely new rows.
const data = computed<Row[]>(() =>
  Array.from({ length: props.rowCount }, (_, i) => ({ id: `r${i}`, name: `Row ${i}` })),
)

const reachEndCount = shallowRef(0)
const reachStartCount = shallowRef(0)

const table = useTemplateRef('table')
defineExpose({ table })
</script>
