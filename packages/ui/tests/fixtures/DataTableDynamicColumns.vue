<template>
  <DataTable :data="rows" row-key="id">
    <template #columns="{ columnData }">
      <Column v-for="c in props.cols" :key="c" :data="columnData" :field="c" :label="c" />
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import DataTable from '../../src/components/DataTable/DataTable.vue'
import Column from '../../src/components/Column.vue'

const props = defineProps<{ cols: ('a' | 'b' | 'c')[] }>()
const rows = [{ id: 1, a: 'A1', b: 'B1', c: 'C1' }]
</script>
