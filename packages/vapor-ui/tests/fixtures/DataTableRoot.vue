<template>
  <DataTable :data="people" row-key="id" selectable @update:selection="onSelectionChange">
    <template #columns="{ columnData }">
      <Column :data="columnData" field="name" label="Name" sortable />
      <Column :data="columnData" field="role" label="Role" />
    </template>
  </DataTable>
  <output data-testid="vapor-datatable-selected-count">{{ selectedCount }}</output>
</template>

<script setup lang="ts" vapor>
// Consumes the BUILT dist bundle's DataTable + its full transitive
// dependency tree (Column, Checkbox, Radio, RadioGroup, Button) — proves
// the whole dependency-graph resolution in gen-vapor-lib.mjs, not just a
// single leaf component.
import { DataTable, Column } from 'vael-ui/vapor'
import { shallowRef } from 'vue'

const people = [
  { id: '1', name: 'Maria', role: 'Engineer' },
  { id: '2', name: 'James', role: 'Designer' },
  { id: '3', name: 'Sophie', role: 'Support' },
]

const selectedCount = shallowRef(0)
function onSelectionChange(rows: unknown[]) {
  selectedCount.value = rows.length
}
</script>
