<template>
  <section class="demo">
    <h2>DataTable</h2>
    <p class="note">
      Slot-based, no external table library: columns are declared as
      <code>&lt;Column&gt;</code> children inside <code>#columns</code> — not a config-array prop —
      and everything else (toolbar, empty state, loading state, footer) is a plain slot the consumer
      owns. Sorting and selection state live inside <code>DataTable</code> itself; <code>T</code> is
      inferred end to end from <code>:data</code>, so <code>field="typo"</code> is a compile error
      and <code>#cell="{ row }"</code> is fully typed. Two equally valid ways to get there: import
      <code>Column</code> directly from <code>vael-ui</code> and bind its own
      <code>:data</code> prop to the slot's <code>columnData</code> (shown below) — it's never read,
      it's purely a type-inference anchor, since Vue's template checker infers a generic component's
      type param from a prop binding, not from a bare tag on its own; or destructure
      <code>{ Column }</code> straight off the slot and render it via
      <code>&lt;component :is="Column"&gt;</code>, which comes pre-bound to <code>T</code> with no
      anchor prop needed. Both compile to the exact same component at runtime.
    </p>

    <h3>200 rows — sortable, searchable, selectable, paginated</h3>
    <p class="note">
      Click "Name" or "Role" to sort (cycles ascending → descending → unsorted). The Status column
      renders a real <code>&lt;Tag&gt;</code> per cell via a <code>#cell</code> slot override.
      <code>selectable</code> renders the checkbox column for you (select-all/indeterminate computed
      from the current row set) — for anything beyond that default (a custom selection column mixed
      with another action, say), <code>useDataTableContext</code> is still exported as the escape
      hatch; it's just no longer required for the common case. <code>rows</code> slices the
      already-sorted/searched data into pages entirely internally — the
      <code>&lt;Pagination&gt;</code> below is dropped straight into <code>#footer</code>, bound to
      the scoped slot's own <code>page</code>/<code>page-count</code>/<code>total</code>.
      <code>resizableColumns</code> (drag a column's right edge) is also on here — try resizing
      "Role". <code>stripedRows</code> is still a real prop (a subtle primary-tinted wash, not a
      flat gray) for a consumer who wants it — off by default here since a clean row + hover state
      alone reads more current than zebra-striping every table.
    </p>
    <DataTable
      v-model:page="page"
      :data="filteredPeople"
      row-key="id"
      selectable
      resizable-columns
      @update:selection="onSelectionChange"
      :rows="pageSize"
    >
      <template #columns="{ columnData }">
        <Column :data="columnData" field="name" label="Name" sortable width="12rem" />
        <Column :data="columnData" field="role" label="Role" sortable width="10rem" />
        <Column :data="columnData" field="status" label="Status">
          <template #cell="{ row }">
            <Tag :variant="statusVariant[row.status]">{{ row.status }}</Tag>
          </template>
        </Column>
      </template>

      <template #toolbar="{ selected, count }">
        <Input
          v-model="search"
          size="sm"
          placeholder="Search people…"
          class="datatable-demo-search"
        >
          <template #start>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M11 11l3.5 3.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </template>
        </Input>
        <span class="note datatable-demo-toolbar-note"
          >{{ count }} rows, {{ selected.size }} selected</span
        >
      </template>

      <template #empty>
        <p class="note datatable-demo-empty-note">No people match “{{ search }}”.</p>
      </template>

      <template #footer="{ pageCount, total }">
        <Pagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-size-options="[10, 20, 50]"
        />
        <span class="note">page {{ page }} of {{ pageCount }}</span>
      </template>
    </DataTable>
    <p class="note">
      {{ selectedCount }} row(s) selected — read from the resolved rows DataTable emits via
      <code>@update:selection</code>.
    </p>

    <h3>Loading state</h3>
    <p class="note">
      <code>loading</code> replaces the entire row area with the <code>#loading</code> slot — this
      demo reuses <code>Skeleton</code>, the same component used everywhere else in this library,
      not a bespoke loading treatment.
    </p>
    <div class="row">
      <Button size="sm" variant="outline" @click="loadingDemo = !loadingDemo">
        {{ loadingDemo ? 'Stop' : 'Simulate loading' }}
      </Button>
    </div>
    <DataTable :data="smallSample" row-key="id" :loading="loadingDemo">
      <template #columns="{ columnData }">
        <Column :data="columnData" field="name" label="Name" />
        <Column :data="columnData" field="role" label="Role" />
        <Column :data="columnData" field="status" label="Status">
          <template #cell="{ row }">
            <Tag :variant="statusVariant[row.status]">{{ row.status }}</Tag>
          </template>
        </Column>
      </template>
      <template #loading>
        <div class="datatable-demo-skeleton-rows">
          <Skeleton v-for="n in 4" :key="n" class="datatable-demo-skeleton-row" />
        </div>
      </template>
      <template #empty>
        <p class="note datatable-demo-empty-note">No data.</p>
      </template>
    </DataTable>

    <h3>Selection modes — click-to-select, and single (radio) selection</h3>
    <p class="note">
      <code>selectionMode="row"</code> (left): no checkbox column at all — clicking anywhere on a
      row toggles it, reusing the same interactive-target guard <code>row-click</code> already
      respects. <code>single</code> (right): a real <code>Radio</code> per row instead of a
      <code>Checkbox</code>, no header select-all, and picking a new row deselects the previous one.
      Also switches to the other <code>Column</code> form — destructure <code>Column</code> off the
      slot and render via <code>&lt;component :is="Column"&gt;</code>, no anchor prop needed.
    </p>
    <div class="datatable-demo-side-by-side">
      <DataTable :data="smallSample" row-key="id" selectable selection-mode="row" size="sm">
        <template #columns="{ Column }">
          <component :is="Column" field="name" label="Name" />
          <component :is="Column" field="role" label="Role" />
        </template>
      </DataTable>
      <DataTable :data="smallSample" row-key="id" selectable single size="sm">
        <template #columns="{ Column }">
          <component :is="Column" field="name" label="Name" />
          <component :is="Column" field="role" label="Role" />
        </template>
      </DataTable>
    </div>

    <h3>Frozen columns — horizontal scroll with Name pinned</h3>
    <p class="note">
      <code>frozenColumns="1"</code> pins the first registered column (sticky-left, offset computed
      from the actual rendered width of whatever precedes it) while the rest scroll underneath it
      inside the existing horizontal-scroll wrapper. <code>showGridlines</code> is also on so the
      column boundaries read clearly while scrolling.
    </p>
    <DataTable :data="smallSample" row-key="id" :frozen-columns="1" show-gridlines>
      <template #columns="{ columnData }">
        <Column :data="columnData" field="name" label="Name" width="10rem" />
        <Column :data="columnData" field="email" label="Email" width="14rem" />
        <Column :data="columnData" field="department" label="Department" width="10rem" />
        <Column :data="columnData" field="location" label="Location" width="10rem" />
        <Column :data="columnData" field="role" label="Role" width="10rem" />
      </template>
    </DataTable>

    <h3>Row expansion</h3>
    <p class="note">
      The <code>#expansion</code> slot renders a full-width detail row directly beneath an expanded
      row; DataTable owns the expand/collapse chevron column, the consumer owns the content.
    </p>
    <DataTable :data="smallSample" row-key="id">
      <template #columns="{ columnData }">
        <Column :data="columnData" field="name" label="Name" />
        <Column :data="columnData" field="role" label="Role" />
        <Column :data="columnData" field="status" label="Status">
          <template #cell="{ row }">
            <Tag :variant="statusVariant[row.status]">{{ row.status }}</Tag>
          </template>
        </Column>
      </template>
      <template #expansion="{ row }">
        <p class="note datatable-demo-expansion-note">
          {{ row.name }} · {{ row.email }} · {{ row.department }}, {{ row.location }}
        </p>
      </template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Column, DataTable, Input, Pagination, Skeleton, Tag } from 'vael-ui'

interface Person {
  id: string
  name: string
  role: string
  status: 'active' | 'invited' | 'suspended'
  email: string
  department: string
  location: string
}

const FIRST_NAMES = [
  'Ama',
  'Kwame',
  'Efua',
  'Kofi',
  'Adjoa',
  'Yaw',
  'Abena',
  'Kojo',
  'Akosua',
  'Kwabena',
  'Priya',
  'Wei',
  'Sofia',
  'Liam',
  'Noor',
  'Diego',
  'Freya',
  'Hiro',
  'Zainab',
  'Mateo',
]
const LAST_NAMES = [
  'Mensah',
  'Owusu',
  'Boateng',
  'Asante',
  'Appiah',
  'Osei',
  'Agyeman',
  'Frimpong',
  'Chen',
  'Silva',
  'Nkomo',
  'Haddad',
  'Rossi',
  'Novak',
  'Lindqvist',
  'Suzuki',
]
const ROLES = ['Engineer', 'Designer', 'Product Manager', 'Support', 'Sales', 'Ops']
const STATUSES: Person['status'][] = ['active', 'invited', 'suspended']
const DEPARTMENTS = ['Platform', 'Growth', 'Core', 'Infra', 'Design']
const LOCATIONS = ['Accra', 'Lagos', 'Nairobi', 'Remote']

const people: Person[] = Array.from({ length: 200 }, (_, i) => ({
  id: `p${i}`,
  name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`,
  role: ROLES[i % ROLES.length]!,
  status: STATUSES[i % STATUSES.length]!,
  email: `person${i}@example.com`,
  department: DEPARTMENTS[i % DEPARTMENTS.length]!,
  location: LOCATIONS[i % LOCATIONS.length]!,
}))
const smallSample = people.slice(0, 5)

const statusVariant: Record<Person['status'], 'success' | 'muted' | 'danger'> = {
  active: 'success',
  invited: 'muted',
  suspended: 'danger',
}

// Search is consumer-owned; DataTable just re-renders whatever data array it's handed
const search = shallowRef('')
const filteredPeople = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return people
  return people.filter((p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q))
})

const selectedCount = shallowRef(0)
function onSelectionChange(rows: Person[]) {
  selectedCount.value = rows.length
}

const page = shallowRef(1)
const pageSize = shallowRef(20)

const loadingDemo = shallowRef(false)
</script>

<style scoped>
.datatable-demo-search {
  max-inline-size: 20rem;
}
.datatable-demo-toolbar-note {
  margin: 0;
  white-space: nowrap;
}
.datatable-demo-empty-note {
  margin: 0;
}
.datatable-demo-skeleton-rows {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-block: 0.25rem;
}
.datatable-demo-skeleton-row {
  block-size: 1.25rem;
  inline-size: 100%;
}
.datatable-demo-side-by-side {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
  align-items: start;
}
.datatable-demo-expansion-note {
  margin: 0;
}
</style>
