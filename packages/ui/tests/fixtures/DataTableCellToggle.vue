<template>
  <DataTable :data="rows" row-key="id">
    <template #columns="{ columnData }">
      <Column :data="columnData" field="name" label="Name">
        <template v-if="custom" #cell="{ value }">Custom {{ value }}</template>
        <template v-if="custom" #header>Custom header</template>
      </Column>
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import DataTable from '../../src/components/DataTable/DataTable.vue'
import Column from '../../src/components/Column.vue'

defineProps<{ custom: boolean }>()
const rows = [{ id: 1, name: 'Ada' }]
</script>
