<template>
  <DataTable v-model:sort="sort" :data="data" row-key="id">
    <template #columns="{ Column }">
      <component :is="Column" field="id" label="ID" />
      <component :is="Column" field="joinedAt" label="Joined" sortable />
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import DataTable from '../../src/components/DataTable/DataTable.vue'

interface Row {
  id: string
  joinedAt: Date
}

// Deliberately NOT chronological by weekday name (Tue before Mon) — a
// naive string-coerced sort would invert these, since 'Tue' < 'Mon'
// alphabetically despite Jan 2 coming before Jan 8.
const data: Row[] = [
  { id: 'later', joinedAt: new Date('2024-01-08T00:00:00Z') },
  { id: 'earlier', joinedAt: new Date('2024-01-02T00:00:00Z') },
]

const sort = shallowRef<{ field: keyof Row | null; dir: 'asc' | 'desc' | null }>({
  field: null,
  dir: null,
})
</script>
