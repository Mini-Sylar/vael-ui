<template>
  <section :id="id" class="meta-table">
    <h2>{{ title }}</h2>
    <p v-if="rows.length === 0" class="empty">{{ emptyText }}</p>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th v-if="showDefault">Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.name">
            <td>
              <code>{{ row.name }}</code>
            </td>
            <td>
              <code class="type">{{ row.type }}</code>
            </td>
            <td v-if="showDefault">
              <code v-if="row.default">{{ row.default }}</code>
            </td>
            <td>{{ row.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MetaRow } from '../types'

withDefaults(
  defineProps<{
    id?: string
    title: string
    rows: MetaRow[]
    emptyText: string
    showDefault?: boolean
  }>(),
  { showDefault: false },
)
</script>

<style scoped>
.meta-table {
  margin-top: 2.75rem;
  scroll-margin-top: calc(var(--docs-header-height) + 1.5rem);
}

h2 {
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  margin-bottom: 0.85rem;
}

.empty {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
}

.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th,
td {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  vertical-align: top;
}

thead th {
  color: var(--ui-text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--ui-muted);
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr {
  transition: background-color var(--ui-duration-press) var(--ui-ease-out);
}

tbody tr:hover {
  background: color-mix(in oklch, var(--ui-text) 4%, transparent);
}

code {
  font-size: 0.85em;
}

.type {
  color: var(--ui-info);
}
</style>
