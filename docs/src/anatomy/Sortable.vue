<!-- Sortable with every part: four tasks, each with its drag handle. -->
<template>
  <div data-specimen class="specimen">
    <Sortable v-model:items="tasks" item-key="id" label-key="title">
      <template #item="{ item }">
        <div class="row">
          <span class="title">{{ item.title }}</span>
          <Tag :variant="item.variant" size="sm">{{ item.stage }}</Tag>
        </div>
      </template>
    </Sortable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sortable, Tag } from 'vael-ui'

const tasks = ref([
  { id: 't1', title: 'Update billing email', stage: 'In review', variant: 'warning' as const },
  { id: 't2', title: 'Invite the design team', stage: 'Done', variant: 'success' as const },
  { id: 't3', title: 'Draft the team plan', stage: 'Next', variant: 'primary' as const },
  { id: 't4', title: 'Archive old projects', stage: 'Backlog', variant: 'muted' as const },
])
</script>

<style scoped>
.specimen {
  inline-size: min(22rem, 100%);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.title {
  font-size: 0.875rem;
}
</style>
