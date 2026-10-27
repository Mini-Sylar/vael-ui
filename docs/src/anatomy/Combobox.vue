<!-- Combobox open with every part: grouped options under a header and above a footer, and beside it a search that matches nothing. -->
<template>
  <div data-specimen class="specimen">
    <Combobox
      v-model="assignee"
      v-model:open="open"
      :items="people"
      placeholder="Assign to"
      :close-on-outside="false"
      aria-label="Assignee"
    >
      <template #start><PhUser :size="16" /></template>
      <template #header="{ count, total }">{{ count }} of {{ total }} people</template>
      <template #footer>
        <Button variant="ghost" size="sm">
          <template #leading><PhUserPlus /></template>
          Invite someone
        </Button>
      </template>
    </Combobox>
    <!-- A search with no match: its panel shows the empty state instead. -->
    <div ref="search">
      <Combobox
        v-model:open="emptyOpen"
        :items="people"
        placeholder="Reviewer"
        :close-on-outside="false"
        aria-label="Reviewer"
      >
        <template #empty>No one named Zoe</template>
      </Combobox>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { Button, Combobox } from 'vael-ui'
import { PhUser, PhUserPlus } from '@phosphor-icons/vue'

const people = [
  {
    label: 'Design',
    items: [
      { label: 'Ada Lovelace', value: 'ada' },
      { label: 'Grace Hopper', value: 'grace' },
    ],
  },
  {
    label: 'Engineering',
    items: [
      { label: 'Alan Turing', value: 'alan' },
      { label: 'Katherine Johnson', value: 'katherine' },
    ],
  },
]
const assignee = ref('grace')
// Both open from the start, and kept open while you point at their parts.
const open = ref(true)
const emptyOpen = ref(true)
// Typed into, as a person would, so the search runs and finds no one.
const search = useTemplateRef<HTMLElement>('search')
onMounted(() => {
  const input = search.value?.querySelector('input')
  if (!input) return
  input.value = 'Zoe'
  input.dispatchEvent(new Event('input', { bubbles: true }))
})
</script>

<style scoped>
.specimen {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: 1.5rem;
  inline-size: min(28rem, 100%);
  min-block-size: 22rem;
}
</style>
