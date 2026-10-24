<template>
  <section class="demo">
    <h3>Column visibility</h3>
    <p class="note">
      Keep the visible columns in a list that checkboxes change, and render each
      <code>Column</code> with <code>v-if</code>. When a column unmounts, the table removes it.
    </p>
    <DataTable :data="people" row-key="id">
      <template #toolbar>
        <Popover v-model:open="open" open-on-trigger-click align="end">
          <template #trigger>
            <Button size="sm" variant="outline">
              <template #leading><PhColumns /></template>
              Columns
            </Button>
          </template>
          <fieldset class="column-list">
            <legend class="column-legend">Show columns</legend>
            <Checkbox
              v-for="column in columns"
              :key="column.field"
              v-model="visible"
              :value="column.field"
              :label="column.label"
              :disabled="visible.length === 1 && visible.includes(column.field)"
            />
          </fieldset>
        </Popover>
      </template>
      <template #columns="{ Column }">
        <template v-for="column in columns" :key="column.field">
          <component
            :is="Column"
            v-if="visible.includes(column.field)"
            :field="column.field"
            :label="column.label"
          />
        </template>
      </template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { Button, Checkbox, DataTable, Popover } from 'vael-ui'
import { PhColumns } from '@phosphor-icons/vue'

interface Person {
  id: number
  name: string
  email: string
  role: string
  city: string
}

const people: Person[] = [
  { id: 1, name: 'Mira Chen', email: 'mira@example.com', role: 'Engineer', city: 'Berlin' },
  { id: 2, name: 'Tom Okafor', email: 'tom@example.com', role: 'Designer', city: 'Lagos' },
  { id: 3, name: 'Ana Ruiz', email: 'ana@example.com', role: 'Engineer', city: 'Madrid' },
]

const columns: { field: keyof Person; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'email', label: 'Email' },
  { field: 'role', label: 'Role' },
  { field: 'city', label: 'City' },
]

const open = shallowRef(false)
// The last visible column can't be hidden, so the table never empties.
const visible = ref<(keyof Person)[]>(['name', 'role', 'city'])
</script>

<style scoped>
.column-list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: 0;
}
.column-legend {
  margin-block-end: 0.5rem;
  padding: 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
