<template>
  <section class="demo">
    <h2>DataTable</h2>
    <p class="note">
      Slot-based, no external table library: columns are declared as
      <code>&lt;Column&gt;</code> children inside <code>#columns</code>, not a config-array prop,
      and everything else (toolbar, empty state, loading state, footer) is a plain slot the consumer
      owns. Sorting and selection state live inside <code>DataTable</code> itself; <code>T</code> is
      inferred end to end from <code>:data</code>, so <code>field="typo"</code> is a compile error
      and <code>#cell="{ row }"</code> is fully typed. Two equally valid ways to get there: import
      <code>Column</code> directly from <code>vael-ui</code> and bind its own
      <code>:data</code> prop to the slot's <code>columnData</code> (shown below), it's never read,
      it's purely a type-inference anchor; or destructure <code>{ Column }</code> straight off the
      slot and render it via <code>&lt;component :is="Column"&gt;</code>, which comes pre-bound to
      <code>T</code> with no anchor prop needed. Both compile to the exact same component at
      runtime.
    </p>

    <h3>Sortable, searchable, paginated</h3>
    <p class="note">
      Click "Name" or "Role" to sort (cycles ascending, descending, unsorted). The Status column
      renders a real <code>&lt;Tag&gt;</code> per cell via a <code>#cell</code> slot override.
      <code>selectable</code> renders the checkbox column for you (select-all/indeterminate computed
      from the current row set). <code>rows</code> slices the already-sorted/searched data into
      pages entirely internally, the <code>&lt;Pagination&gt;</code> below is dropped straight into
      <code>#footer</code>, bound to the scoped slot's own
      <code>page</code>/<code>page-count</code>/<code>total</code>. <code>resizableColumns</code> is
      also on here, try dragging "Role"'s right edge.
    </p>
    <DataTable
      v-model:page="page"
      :data="filteredEmployees"
      row-key="id"
      selectable
      resizable-columns
      @update:selection="onSelectionChange"
      :rows="pageSize"
    >
      <template #columns="{ columnData }">
        <Column :data="columnData" field="name" label="Name" sortable width="12rem" />
        <Column :data="columnData" field="role" label="Role" sortable width="10rem" />
        <Column :data="columnData" field="salary" label="Salary" sortable width="8rem">
          <template #cell="{ row }">${{ row.salary.toLocaleString() }}</template>
        </Column>
        <Column :data="columnData" field="startDate" label="Start date" width="8rem" />
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
          placeholder="Search employees…"
          class="datatable-demo-search"
        >
          <template #start>
            <PhMagnifyingGlass />
          </template>
        </Input>
        <span class="note datatable-demo-toolbar-note"
          >{{ count }} rows, {{ selected.size }} selected</span
        >
      </template>

      <template #empty>
        <p class="note datatable-demo-empty-note">No employees match "{{ search }}".</p>
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

    <h3>Loading state</h3>
    <p class="note">
      <code>loading</code> replaces the entire row area with the <code>#loading</code> slot, this
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
    </DataTable>

    <h3>Selection modes</h3>
    <p class="note">
      Left, <code>selectionMode="row"</code>: no checkbox column at all, clicking anywhere on a row
      toggles it. Right, <code>single</code>: a real <code>Radio</code> per row instead of a
      <code>Checkbox</code>, no header select-all, and picking a new row deselects the previous one.
      Also switches to the other <code>Column</code> form, destructure <code>Column</code> off the
      slot and render via <code>&lt;component :is="Column"&gt;</code>.
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

    <h3>Row expansion</h3>
    <p class="note">
      The <code>#expansion</code> slot renders a full-width detail row directly beneath an expanded
      row; DataTable owns the expand/collapse chevron column, the consumer owns the content. Each
      row here has a deliberately different detail height (one line, a short bio, a longer bio with
      a skills list) — the open/close transition measures each row's real height rather than
      assuming a fixed one, so this is the actual thing to check when testing it.
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
        <div class="datatable-demo-expansion">
          <p class="datatable-demo-expansion-note">
            {{ row.name }} · {{ row.email }} · {{ row.department }}
          </p>
          <p v-if="expansionDetail(row).bio" class="datatable-demo-expansion-note">
            {{ expansionDetail(row).bio }}
          </p>
          <div v-if="expansionDetail(row).skills" class="datatable-demo-expansion-skills">
            <Tag v-for="skill in expansionDetail(row).skills" :key="skill" variant="muted">
              {{ skill }}
            </Tag>
          </div>
        </div>
      </template>
    </DataTable>

    <h3>Virtualized (large data)</h3>
    <p class="note">
      <code>virtualize</code> windows rendering to only the visible rows + overscan — this table has
      {{ bigDataset.length.toLocaleString() }} rows, but only a couple dozen real
      <code>&lt;tr&gt;</code> elements ever exist in the DOM at once, bounded above/below by two
      spacer rows that keep native table scroll height correct. Row height is measured per-row by
      default (rows can wrap or vary), so this works even when cell content isn't uniform.
      <code>reach-end</code>/<code>reach-start</code> fire as the window nears either edge, exactly
      what you'd wire to <code>useInfiniteQuery</code>'s <code>fetchNextPage</code> for a real
      server-backed table. Scroll to the bottom to see it fire below.
      <code>selectable</code> composes cleanly with virtualization too —
      <code>selected</code> tracks row keys, not DOM nodes, so selecting a row keeps it selected
      even after it scrolls out of the rendered window and back in. This demo uses
      <code>selection-mode="row"</code> rather than the checkbox column: toggling one row's checkbox
      still recomputes selection state against the full 5,000-row dataset, which is real, separate
      perf work being tracked on its own.
    </p>
    <DataTable
      :data="bigDataset"
      row-key="id"
      virtualize
      selectable
      selection-mode="row"
      scroll-height="360px"
      @reach-end="reachEndCount++"
    >
      <template #columns="{ columnData }">
        <Column :data="columnData" field="name" label="Name" sortable width="12rem" />
        <Column :data="columnData" field="role" label="Role" sortable width="10rem" />
        <Column :data="columnData" field="department" label="Department" width="8rem" />
        <Column :data="columnData" field="status" label="Status">
          <template #cell="{ row }">
            <Tag :variant="statusVariant[row.status]">{{ row.status }}</Tag>
          </template>
        </Column>
      </template>
    </DataTable>
    <p class="note">reach-end fired {{ reachEndCount }} time(s).</p>
  </section>
  <section class="demo">
    <h3>Reorderable columns</h3>
    <p>
      <code>reorderableColumns</code> lets header cells be dragged. The grip shows at rest by
      default (<code>columnGripVisibility="always"</code>) so it reads as draggable at a glance;
      pass <code>"hover"</code> to fade it in only on hover/focus instead. Individual columns opt
      out with <code>:reorderable="false"</code> — here <strong>Name</strong> is pinned, the same
      way <code>resizable</code> already works per column.
    </p>
    <DataTable
      :data="colPeople"
      row-key="id"
      reorderable-columns
      class="datatable-columns-demo"
      @column-reorder="colOrder = $event as string[]"
    >
      <template #columns="{ Column }">
        <component :is="Column" field="name" label="Name" :reorderable="false" sortable />
        <component :is="Column" field="role" label="Role" sortable />
        <component :is="Column" field="team" label="Team" />
      </template>
    </DataTable>
    <output class="datatable-columns-order">{{
      colOrder.join(' / ') || 'Drag a column header'
    }}</output>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { Button, Column, DataTable, Input, Pagination, Skeleton, Tag } from 'vael-ui'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

const colPeople = [
  { id: 'c1', name: 'Mira Mitchell', role: 'Engineer', team: 'Platform' },
  { id: 'c2', name: 'Tom Okafor', role: 'Designer', team: 'Brand' },
  { id: 'c3', name: 'Ana Ruiz', role: 'Engineer', team: 'Growth' },
]
const colOrder = ref<string[]>([])

interface Employee {
  id: string
  name: string
  role: string
  status: 'active' | 'invited' | 'suspended'
  salary: number
  startDate: string
  email: string
  department: string
}

const FIRST_NAMES = [
  'Mira',
  'Marcus',
  'Elena',
  'Kai',
  'Amelia',
  'Oscar',
  'Bella',
  'Jasper',
  'Aurora',
  'Felix',
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
  'Mitchell',
  "O'Connor",
  'Bennett',
  'Anderson',
  'Adams',
  'Olson',
  'Armstrong',
  'Fisher',
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
const STATUSES: Employee['status'][] = ['active', 'invited', 'suspended']
const DEPARTMENTS = ['Platform', 'Growth', 'Core', 'Infra', 'Design']

const employees: Employee[] = Array.from({ length: 64 }, (_, i) => ({
  id: `e${i}`,
  name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`,
  role: ROLES[i % ROLES.length]!,
  status: STATUSES[i % STATUSES.length]!,
  salary: 58000 + ((i * 3117) % 74000),
  startDate: `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
  email: `person${i}@example.com`,
  department: DEPARTMENTS[i % DEPARTMENTS.length]!,
}))
const smallSample = employees.slice(0, 5)

// Deliberately uneven heights (one line / bio / bio + skills) — the row-expansion
// demo's whole point is exercising the open/close transition's real measured
// height against something other than one fixed size.
interface ExpansionDetail {
  bio?: string
  skills?: string[]
}
const EXPANSION_DETAILS: Record<string, ExpansionDetail> = {
  e1: {
    bio: 'Leads the onboarding flow redesign, usually first to jump on a support escalation.',
  },
  e2: {
    bio: "Owns the design system's component library end to end, from Figma source to shipped CSS.",
    skills: ['Design systems', 'Figma', 'Accessibility', 'Motion design'],
  },
  e4: {
    bio: "Runs the platform team's on-call rotation, the go-to for anything touching the deploy pipeline.",
    skills: ['Kubernetes', 'Terraform', 'Incident response', 'Postgres', 'Go'],
  },
}
function expansionDetail(row: Employee): ExpansionDetail {
  return EXPANSION_DETAILS[row.id] ?? {}
}
const bigDataset: Employee[] = Array.from({ length: 5000 }, (_, i) => ({
  id: `big-${i}`,
  name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`,
  role: ROLES[i % ROLES.length]!,
  status: STATUSES[i % STATUSES.length]!,
  salary: 58000 + ((i * 3117) % 74000),
  startDate: `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
  email: `person${i}@example.com`,
  department: DEPARTMENTS[i % DEPARTMENTS.length]!,
}))
const reachEndCount = shallowRef(0)

const statusVariant: Record<Employee['status'], 'success' | 'muted' | 'danger'> = {
  active: 'success',
  invited: 'muted',
  suspended: 'danger',
}

// Search is consumer-owned; DataTable just re-renders whatever data array it's handed
const search = shallowRef('')
const filteredEmployees = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return employees
  return employees.filter(
    (p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q),
  )
})

function onSelectionChange(_rows: Employee[]) {
  // consumer owns whatever it wants to do with the resolved selection
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
.datatable-demo-expansion {
  display: grid;
  gap: 0.375rem;
}
.datatable-demo-expansion-note {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
.datatable-demo-expansion-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-block-start: 0.125rem;
}

.datatable-columns-demo {
  max-inline-size: 34rem;
}
.datatable-columns-order {
  display: block;
  margin-block-start: 0.5rem;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
