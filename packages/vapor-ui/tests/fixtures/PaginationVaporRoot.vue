<template>
  <DataTable v-model:page="page" :data="rows" row-key="id" :rows="pageSize">
    <template #columns="{ Column }">
      <Column field="name" header="Name" />
    </template>
    <template #footer="{ total }">
      <Pagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-size-options="[10, 20, 50]"
      />
    </template>
  </DataTable>
</template>

<script setup lang="ts" vapor>
// Pagination in a DataTable's footer, as the docs overview has it.
import { shallowRef } from 'vue'
import { DataTable, Pagination } from 'vael-ui/vapor'

const page = shallowRef(1)
const pageSize = shallowRef(10)
const rows = Array.from({ length: 40 }, (_, i) => ({ id: i, name: `Person ${i}` }))
</script>
