<template>
  <section :id="id" class="meta-table">
    <h2>{{ title }}</h2>
    <p v-if="rows.length === 0" class="empty">{{ emptyText }}</p>
    <div v-else class="table-frame">
      <table>
        <thead>
          <tr>
            <th scope="col">{{ t('metaTable.name') }}</th>
            <th scope="col">{{ t('metaTable.type') }}</th>
            <th v-if="showDefault" scope="col">{{ t('metaTable.default') }}</th>
            <th scope="col">{{ t('metaTable.description') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :id="rowId(row)" :key="row.name">
            <th scope="row" class="name-cell">
              <a
                class="name"
                :href="`#${rowId(row)}`"
                :aria-label="`${t('metaTable.link')} ${row.name}`"
              >
                <code>{{ row.name }}</code>
              </a>
              <span v-if="row.required" class="required">{{ t('metaTable.required') }}</span>
            </th>
            <td class="type-cell" :data-label="t('metaTable.type')">
              <InlineCode v-if="kind === 'events'" :code="eventSignature(row)" />
              <InlineCode v-else :code="displayType(row)" lang="type" />
            </td>
            <td v-if="showDefault" class="default-cell" :data-label="t('metaTable.default')">
              <InlineCode v-if="displayDefault(row)" :code="displayDefault(row)!" />
              <span v-else class="none" aria-hidden="true">–</span>
            </td>
            <td class="description-cell">
              <RichText v-if="row.description" :text="row.description" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InlineCode from './InlineCode.vue'
import RichText from './RichText.vue'
import type { MetaRow } from '../types'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    id?: string
    title: string
    rows: MetaRow[]
    emptyText: string
    showDefault?: boolean
    /** Events show their payload as a call signature instead of a tuple. */
    kind?: 'props' | 'events' | 'slots' | 'exposed'
  }>(),
  { showDefault: false, kind: undefined },
)

// The default as written in source. An explicit `undefined` means "unset",
// same as no default at all.
function displayDefault(row: MetaRow): string | null {
  const text = row.defaultText ?? row.default
  return text && text !== 'undefined' ? text : null
}

// `[value: boolean, details: X]` reads as the handler's arguments.
function eventSignature(row: MetaRow): string {
  return row.type.replace(/^\[(.*)\]$/s, '($1)')
}

// Every row gets a stable, shareable anchor: `#props-side`, `#events-change`.
function rowId(row: MetaRow): string {
  return `${props.id ?? 'api'}-${row.name.replace(/[^\w-]/g, '-')}`
}

// vue-component-meta keeps a named union alias (e.g. `Side`) as the opaque
// type string, but already expands its members one level down in `schema`.
// Only substitute for a pure string-literal union (Side, Placement, ...) —
// booleans/numbers already read fine as `row.type` and shouldn't become
// `true | false`.
function displayType(row: MetaRow): string {
  const schema = row.schema
  if (
    schema &&
    typeof schema === 'object' &&
    schema.kind === 'enum' &&
    Array.isArray(schema.schema) &&
    schema.schema.length > 0 &&
    schema.schema.every((m) => m === 'undefined' || (typeof m === 'string' && /^".*"$/.test(m)))
  ) {
    const members = schema.schema.filter((m): m is string => m !== 'undefined')
    if (members.length > 0) return members.map((m) => `'${m.slice(1, -1)}'`).join(' | ')
  }
  // An optional prop's `| undefined` is noise here: the missing "Required"
  // marker already says it's optional.
  const type = row.type.replace(/ \| undefined$/, '')
  // `ui` expands to a long object literal of identical `UiPartValue` keys;
  // a Record over the part names says the same thing in one line.
  const parts = type.match(/^Partial<\{ ((?:\w+: UiPartValue; )+)\}>$/)
  if (parts) {
    const names = parts[1]
      .split('; ')
      .filter(Boolean)
      .map((entry) => `'${entry.split(':')[0]}'`)
    return `Partial<Record<${names.join(' | ')}, UiPartValue>>`
  }
  return type
}
</script>

<style scoped>
.meta-table {
  margin-top: 2.75rem;
  scroll-margin-top: calc(var(--docs-header-height) + 1.5rem);
  container-type: inline-size;
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

.table-frame {
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  overflow: hidden;
}

/* Text at ~13px with code a step smaller: mono runs visually larger, so ~12px
   code sits level with the prose beside it instead of shrinking under it. */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  line-height: 1.55;
}

th,
td {
  text-align: left;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--ui-border);
  vertical-align: top;
}

thead th {
  color: var(--ui-text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--ui-muted);
  white-space: nowrap;
}

tbody tr:last-child > * {
  border-bottom: none;
}

tbody tr {
  scroll-margin-top: calc(var(--docs-header-height) + 1.5rem);
  transition: background-color var(--ui-duration-press) var(--ui-ease-out);
}

tbody tr:hover {
  background: color-mix(in oklch, var(--ui-text) 3%, transparent);
}

/* A followed anchor briefly marks its row so the eye lands on it. */
tbody tr:target {
  background: color-mix(in oklch, var(--ui-info) 10%, transparent);
}

/* Name: the row's anchor, so it carries the weight. */
.name-cell {
  font-weight: 400;
  white-space: nowrap;
}

.name {
  color: var(--ui-text);
  text-decoration: none;
  border-radius: 4px;
}

.name code {
  font-size: 0.92em;
  font-weight: 600;
}

.name:hover code {
  text-decoration: underline;
  text-decoration-color: var(--ui-text-muted);
  text-underline-offset: 3px;
}

.name:focus-visible {
  outline: 2px solid var(--ui-ring, var(--ui-info));
  outline-offset: 2px;
}

.required {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--ui-danger, var(--ui-text-muted));
}

/* Type and default are reference detail: highlighted, but a step quieter. */
.type-cell {
  min-width: 11rem;
}

.default-cell {
  min-width: 5.5rem;
}

.type-cell :deep(.inline-code),
.default-cell :deep(.inline-code) {
  font-size: 0.92em;
}

.none {
  color: var(--ui-text-muted);
}

.description-cell {
  min-width: 14rem;
  color: var(--ui-text);
  text-wrap: pretty;
}

.description-cell :deep(.inline-code) {
  font-size: 0.9em;
  padding: 0.05em 0.3em;
  border-radius: 4px;
  white-space: nowrap;
}

.description-cell :deep(.inline-code:not(.code-ref)) {
  background: color-mix(in oklch, var(--ui-text) 7%, transparent);
}

/* Narrow column: each row becomes a stacked card instead of a table that
   scrolls sideways. Name first, then description, then type and default as
   labelled detail lines. */
@container (max-width: 40rem) {
  thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  table,
  tbody,
  tr,
  th,
  td {
    display: block;
  }

  tbody tr {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 0.75rem;
    padding: 0.85rem;
    border-bottom: 1px solid var(--ui-border);
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  tbody tr > * {
    grid-column: 1 / -1;
    padding: 0;
    border: none;
    min-width: 0;
  }

  .name-cell {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .required {
    display: inline;
    margin: 0;
  }

  .description-cell {
    order: 1;
    margin-top: 0.35rem;
  }

  .type-cell,
  .default-cell {
    order: 2;
    display: grid;
    grid-template-columns: subgrid;
    margin-top: 0.4rem;
    font-size: 0.875rem;
  }

  .type-cell::before,
  .default-cell::before {
    content: attr(data-label);
    color: var(--ui-text-muted);
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.9;
  }

  .default-cell:has(.none) {
    display: none;
  }
}
</style>
