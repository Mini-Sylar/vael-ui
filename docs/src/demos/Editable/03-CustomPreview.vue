<template>
  <section class="demo">
    <h3>Your own preview and your own control</h3>
    <p class="note">
      <code>#preview</code> sets the resting look: a page heading, a one-line title that truncates,
      and an empty value you can still click. <code>size</code> keeps the input the same size as the
      preview. The status and the due date use <code>#edit</code> with a Select and a DatePicker
      that save as soon as you pick.
    </p>
    <div class="stack">
      <Editable v-model="heading" size="lg" aria-label="Page title">
        <template #preview="{ value }">
          <span class="heading">
            {{ value }}
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
              <path
                d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </template>
      </Editable>
      <Editable v-model="long" aria-label="Description" class="narrow" />
      <Editable v-model="empty" placeholder="Untitled" size="sm" aria-label="Name">
        <template #preview="{ value }">
          <em v-if="!value" class="muted">Untitled (click to name)</em>
          <template v-else>{{ value }}</template>
        </template>
      </Editable>
      <!-- Both slots at once: a badge at rest, a Select while editing. -->
      <Editable v-model="status" size="sm" aria-label="Status">
        <template #preview="{ value }">
          <Badge :variant="statusVariant[value] ?? 'muted'">{{ value }}</Badge>
        </template>
        <template #edit="{ value, update, submit }">
          <Select
            :model-value="value"
            :items="statuses"
            size="sm"
            aria-label="Status"
            @update:model-value="
              (next) => {
                update(String(next))
                submit()
              }
            "
          />
        </template>
      </Editable>
      <!-- A date: the text model carries an ISO day, the DatePicker edits it. -->
      <Editable v-model="due" size="sm" aria-label="Due date">
        <template #preview="{ value }">
          <span class="due">Due {{ value ? dateLabel(value) : 'unset' }}</span>
        </template>
        <template #edit="{ value, update, submit }">
          <DatePicker
            :model-value="value ? fromIso(value) : null"
            size="sm"
            aria-label="Due date"
            @update:model-value="
              (next) => {
                update(next instanceof Date ? toIso(next) : '')
                submit()
              }
            "
          />
        </template>
      </Editable>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Badge, DatePicker, Editable, Select } from 'vael-ui'

const heading = shallowRef('Release notes')
const long = shallowRef(
  'A description long enough to overflow its column, which the preview truncates and the input scrolls, so neither side ever wraps the row.',
)
const empty = shallowRef('')
const status = shallowRef('In review')
const due = shallowRef('2026-11-06')
// Local days both ways: `new Date('2026-11-06')` and toISOString() are UTC and shift a day.
const fromIso = (iso: string) => new Date(`${iso}T00:00`)
const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateLabel = (iso: string) =>
  fromIso(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const statuses = ['Draft', 'In review', 'Approved', 'Shipped'].map((s) => ({ label: s, value: s }))
const statusVariant: Record<string, 'muted' | 'success' | 'warning' | 'info'> = {
  Draft: 'muted',
  'In review': 'warning',
  Approved: 'info',
  Shipped: 'success',
}
</script>

<style scoped>
.stack {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}
.heading {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}
.heading svg {
  color: var(--ui-text-muted);
}
.narrow {
  max-inline-size: 18rem;
}
.muted,
.due {
  color: var(--ui-text-muted);
}
</style>
