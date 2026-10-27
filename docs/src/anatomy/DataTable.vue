<!-- DataTable with every part: a toolbar and footer, a sortable, a reorderable and a resizable column, and an expanded row. -->
<template>
  <div ref="specimen" data-specimen class="specimen">
    <DataTable :data="members" row-key="id" size="sm" reorderable-columns>
      <template #toolbar>
        <strong class="title">Members</strong>
        <Button size="sm" variant="outline">Invite</Button>
      </template>
      <template #columns="{ columnData }">
        <Column :data="columnData" field="name" label="Name" sortable />
        <Column :data="columnData" field="plan" label="Plan" resizable :reorderable="false" />
        <Column :data="columnData" field="seats" label="Seats" :reorderable="false" />
      </template>
      <template #expansion="{ row }">
        <span class="detail">{{ row.email }} · joined {{ row.joined }}</span>
      </template>
      <template #footer>
        <span class="detail">3 of 12 members</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { Button, Column, DataTable } from 'vael-ui'

const members = [
  {
    id: 1,
    name: 'Ada Lovelace',
    plan: 'Team',
    seats: 8,
    email: 'ada@lovelace.dev',
    joined: 'March 2024',
  },
  {
    id: 2,
    name: 'Grace Hopper',
    plan: 'Pro',
    seats: 3,
    email: 'grace@hopper.dev',
    joined: 'May 2024',
  },
  {
    id: 3,
    name: 'Alan Turing',
    plan: 'Free',
    seats: 1,
    email: 'alan@turing.dev',
    joined: 'June 2024',
  },
]

// Expansion is internal state: open the first row through its own toggle.
const specimen = useTemplateRef('specimen')
onMounted(() =>
  specimen.value?.querySelector<HTMLButtonElement>('.ui-datatable-td--expand button')?.click(),
)
</script>

<style scoped>
.specimen {
  inline-size: min(26rem, 100%);
}
.title {
  font-size: 0.875rem;
}
.detail {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
