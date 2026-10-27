<!-- Select open with every part: grouped options under a header, filter and footer, and beside it an empty one. -->
<template>
  <div data-specimen class="specimen">
    <Select
      v-model="role"
      v-model:open="open"
      :items="roles"
      filter
      filter-placeholder="Search roles"
      :close-on-outside="false"
      aria-label="Role"
    >
      <template #header="{ count, total }">{{ count }} of {{ total }} roles</template>
      <template #footer>
        <Button variant="ghost" size="sm">
          <template #leading><PhPlus /></template>
          New role
        </Button>
      </template>
    </Select>
    <!-- No options yet: its panel shows the empty state instead. -->
    <Select
      v-model:open="emptyOpen"
      :items="[]"
      placeholder="Team"
      :close-on-outside="false"
      aria-label="Team"
    >
      <template #empty>No teams yet</template>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button, Select } from 'vael-ui'
import { PhPlus } from '@phosphor-icons/vue'

const roles = [
  {
    label: 'Workspace',
    items: [
      { label: 'Owner', value: 'owner' },
      { label: 'Admin', value: 'admin' },
    ],
  },
  {
    label: 'Project',
    items: [
      { label: 'Editor', value: 'editor' },
      { label: 'Viewer', value: 'viewer' },
    ],
  },
]
const role = ref('editor')
// Both open from the start, and kept open while you point at their parts.
const open = ref(true)
const emptyOpen = ref(true)
</script>

<style scoped>
.specimen {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: 1.5rem;
  inline-size: min(26rem, 100%);
  min-block-size: 26rem;
}
</style>
