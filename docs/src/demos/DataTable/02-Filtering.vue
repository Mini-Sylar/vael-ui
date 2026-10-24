<template>
  <section class="demo">
    <h3>Filtering</h3>
    <p class="note">
      Filter the rows before you pass them to <code>data</code>. Here a <code>computed</code> keeps
      the rows that match the search and the status, and the table shows the rows it receives.
    </p>
    <div class="filters">
      <Input
        v-model="search"
        class="search"
        type="search"
        placeholder="Search name or role"
        aria-label="Search"
      >
        <template #start><PhMagnifyingGlass /></template>
      </Input>
      <SelectButton v-model="status" :items="statusItems" :allow-empty="false" size="sm" />
    </div>
    <DataTable :data="filtered" row-key="id">
      <template #columns="{ Column }">
        <component :is="Column" field="name" label="Name" sortable />
        <component :is="Column" field="role" label="Role" sortable />
        <component :is="Column" field="status" label="Status">
          <template #cell="{ row }">
            <Tag :variant="row.status === 'active' ? 'success' : 'warning'">{{ row.status }}</Tag>
          </template>
        </component>
      </template>
      <template #empty>
        <p class="demo-status">No people match “{{ search }}”.</p>
      </template>
    </DataTable>
    <p class="demo-status">{{ filtered.length }} of {{ people.length }} people</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { DataTable, Input, SelectButton, Tag } from 'vael-ui'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

interface Person {
  id: number
  name: string
  role: string
  status: 'active' | 'invited'
}

const people: Person[] = [
  { id: 1, name: 'Mira Chen', role: 'Engineer', status: 'active' },
  { id: 2, name: 'Tom Okafor', role: 'Designer', status: 'invited' },
  { id: 3, name: 'Ana Ruiz', role: 'Engineer', status: 'active' },
  { id: 4, name: 'Kai Jensen', role: 'Product manager', status: 'active' },
  { id: 5, name: 'Priya Nair', role: 'Designer', status: 'active' },
  { id: 6, name: 'Liam Walsh', role: 'Support', status: 'invited' },
]

const search = shallowRef('')
const status = shallowRef<'all' | Person['status']>('all')
const statusItems = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Invited', value: 'invited' },
]

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return people.filter(
    (person) =>
      (status.value === 'all' || person.status === status.value) &&
      (person.name.toLowerCase().includes(query) || person.role.toLowerCase().includes(query)),
  )
})
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-block-end: 0.75rem;
}
.search {
  max-inline-size: 16rem;
}
</style>
