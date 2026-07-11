<template>
  <DataTable :data="data" row-key="id">
    <template #columns="{ Column }">
      <component
        :is="Column"
        v-for="field in order"
        :key="field"
        :field="field"
        :label="LABELS[field]"
      />
    </template>
  </DataTable>
</template>

<!--
  Proves DataTable.vue's `resortColumnsByDom` (Task 2 regression): `order` is
  a plain prop here so `screen.rerender()` can drive it, but the important
  part is the `v-for` is keyed by `field` — swapping the array's element
  order re-patches the SAME <Column> component instances into new DOM
  positions (Vue's keyed diff), it never remounts them, so registerColumn
  (which only runs once, in setup()) never fires again. If DataTable still
  rendered columns in original registration order, this fixture's rendered
  <th>/<td> order would stay A/B/C no matter what `order` says.
-->
<script setup lang="ts">
import DataTable from '../../src/components/DataTable.vue'

interface Row {
  id: string
  a: number
  b: number
  c: number
}

defineProps<{ order: ('a' | 'b' | 'c')[] }>()

const LABELS = { a: 'A', b: 'B', c: 'C' } as const

const data: Row[] = [{ id: 'r0', a: 1, b: 2, c: 3 }]
</script>
