<template>
  <DataTable :data="data" row-key="id" :stacked-breakpoint="stackedBreakpoint">
    <template #columns="{ Column }">
      <component :is="Column" field="name" label="Name" />
      <component :is="Column" field="age" label="Age" />
    </template>

    <template #expansion="{ row }">
      <div :data-testid="`expansion-${row.id}`">Details for {{ row.name }}, age {{ row.age }}</div>
    </template>
  </DataTable>
</template>

<!--
  A dedicated fixture, not a `showExpansion` toggle bolted onto the shared
  DataTableFixture: unconditionally declaring `<template #expansion>` is
  required (see DataTable.vue's own comment on `<template v-for>`/dynamic
  slots) — a `v-if` directly on the `<template #slotName>` tag itself marks
  the WHOLE component's slots as dynamic in Vue's compiler, which was
  empirically observed to break DOM identity for content rendered through a
  DIFFERENT slot's `<component :is>` dispatch (the manual
  useDataTableContext-composed selection cell) on every unrelated re-render.
  Keeping this feature's tests in their own fixture sidesteps that
  entirely — no other test in this file needs `#expansion` toggled on/off.
-->
<script setup lang="ts">
import DataTable from '../../src/components/DataTable/DataTable.vue'

interface Person {
  id: string
  name: string
  age: number
}

defineProps<{ stackedBreakpoint?: string }>()

const data: Person[] = [
  { id: 'p0', name: 'Alice', age: 20 },
  { id: 'p1', name: 'Bob', age: 27 },
  { id: 'p2', name: 'Charlie', age: 34 },
]
</script>
