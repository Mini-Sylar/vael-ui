<template>
  <section class="demo">
    <h3>Month planner</h3>
    <p>
      <code>planner</code> lays the month out as boxes that fill their container and grow with what
      you put in <code>#day</code>. A <code>Sortable</code> in each day, sharing one group, drags
      tasks to another day; a click on a task opens it instead of picking the day.
    </p>
    <Calendar v-model="day" planner :first-day-of-week="1">
      <template #day="{ date }">
        <span class="date">{{ date.getDate() }}</span>
        <Sortable
          :items="tasks[iso(date)] ?? []"
          item-key="id"
          label-key="label"
          :group="board"
          :group-id="iso(date)"
          handle="item"
          variant="plain"
          class="day-tasks"
        >
          <template #item="{ item }">
            <span class="chip" @click="opened = item.label">{{ item.label }}</span>
          </template>
        </Sortable>
      </template>
    </Calendar>
    <p class="status">{{ opened ? `Opened “${opened}”` : 'Drag a task to another day.' }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Calendar, Sortable, useSortableGroup } from 'vael-ui'

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = new Date()
const at = (offset: number) =>
  iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset))
const day = ref(today)
const opened = ref<string | null>(null)
const tasks = ref<Record<string, { id: string; label: string }[]>>({
  [at(0)]: [{ id: 'a', label: 'Standup notes' }],
  [at(1)]: [
    { id: 'b', label: 'Ship v2' },
    { id: 'c', label: 'Review PR' },
  ],
  [at(3)]: [{ id: 'd', label: 'Offsite' }],
})
const board = useSortableGroup({
  onTransfer: (value, from, to) => {
    const source = tasks.value[from.groupId as string]!
    const [task] = source.splice(
      source.findIndex((t) => t.id === value),
      1,
    )
    ;(tasks.value[to.groupId as string] ??= []).splice(to.index, 0, task!)
  },
})
</script>

<style scoped>
.date {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
.day-tasks {
  gap: 0.1875rem;
  min-block-size: 1.25rem;
}
.chip {
  display: block;
  overflow: hidden;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: color-mix(in oklch, var(--ui-primary) 14%, transparent);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
