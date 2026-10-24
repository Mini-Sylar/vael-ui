<template>
  <section class="demo">
    <h3>Row grouping</h3>
    <p class="note">
      Group the rows yourself, then pass one flat list with a header row before each group. Each
      header row has its own key, so CSS can style it, and its button collapses the group. Leave the
      columns unsorted, because sorting would move the header rows.
    </p>
    <DataTable :data="grouped" :row-key="(row) => row.key" class="grouped">
      <template #columns="{ Column }">
        <component :is="Column" field="name" label="Name">
          <template #cell="{ row }">
            <button
              v-if="row.kind === 'group'"
              type="button"
              class="group-toggle"
              :aria-expanded="!folded.has(row.team)"
              @click="toggle(row.team)"
            >
              <PhCaretRight class="caret" aria-hidden="true" />
              {{ row.team }} <span class="count">{{ row.count }}</span>
            </button>
            <template v-else>{{ row.name }}</template>
          </template>
        </component>
        <component :is="Column" field="role" label="Role" />
        <component :is="Column" field="city" label="City" />
      </template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { DataTable } from 'vael-ui'
import { PhCaretRight } from '@phosphor-icons/vue'

interface Person {
  id: number
  name: string
  team: string
  role: string
  city: string
}
type Row =
  | ({ kind: 'person'; key: string } & Person)
  | { kind: 'group'; key: string; team: string; count: number; name: ''; role: ''; city: '' }

const people: Person[] = [
  { id: 1, name: 'Mira Chen', team: 'Engineering', role: 'Engineer', city: 'Berlin' },
  { id: 2, name: 'Tom Okafor', team: 'Design', role: 'Designer', city: 'Lagos' },
  { id: 3, name: 'Ana Ruiz', team: 'Engineering', role: 'Engineer', city: 'Madrid' },
  { id: 4, name: 'Kai Jensen', team: 'Product', role: 'Product manager', city: 'Oslo' },
  { id: 5, name: 'Priya Nair', team: 'Design', role: 'Researcher', city: 'Pune' },
  { id: 6, name: 'Wei Zhang', team: 'Engineering', role: 'Tech lead', city: 'Taipei' },
]

const folded = reactive(new Set<string>())
function toggle(team: string) {
  if (folded.has(team)) folded.delete(team)
  else folded.add(team)
}

const grouped = computed<Row[]>(() => {
  const teams = new Map<string, Person[]>()
  for (const person of people) teams.set(person.team, [...(teams.get(person.team) ?? []), person])
  return [...teams].flatMap(([team, members]) => [
    {
      kind: 'group',
      key: `group:${team}`,
      team,
      count: members.length,
      name: '',
      role: '',
      city: '',
    },
    ...(folded.has(team)
      ? []
      : members.map((person) => ({
          kind: 'person' as const,
          key: `person:${person.id}`,
          ...person,
        }))),
  ])
})
</script>

<style scoped>
.grouped :deep(tr[data-row-key^='group:']) {
  background: var(--ui-muted);
  font-weight: 600;
}
.group-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.caret {
  transition: rotate 150ms var(--ui-ease-out);
}
.group-toggle[aria-expanded='true'] .caret {
  rotate: 90deg;
}
.count {
  color: var(--ui-text-muted);
  font-weight: 400;
}
</style>
