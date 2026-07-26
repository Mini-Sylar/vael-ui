<template>
  <div>
    <Card
      title="All orders"
      :description="`${orders.length} orders — sortable, searchable, selectable.`"
    >
      <DataTable
        :data="filteredOrders"
        row-key="id"
        selectable
        scroll-height="26rem"
        @update:selection="onSelectionChange"
      >
        <template #columns="{ columnData }">
          <Column :data="columnData" field="id" label="Order" sortable />
          <Column :data="columnData" field="customer" label="Customer" sortable />
          <Column :data="columnData" field="email" label="Email" />
          <Column :data="columnData" field="amount" label="Amount" sortable>
            <template #cell="{ row }">
              <Transition name="ui-fade" mode="out-in">
                <span :key="search">{{ currency.format(row.amount) }}</span>
              </Transition>
            </template>
          </Column>
          <Column :data="columnData" field="status" label="Status">
            <template #cell="{ row }">
              <Transition name="ui-fade" mode="out-in">
                <Tag :key="search" :variant="STATUS_VARIANT[row.status]">{{ row.status }}</Tag>
              </Transition>
            </template>
          </Column>
          <Column :data="columnData" field="date" label="Date" sortable />
        </template>
        <template #toolbar="{ count, selected }">
          <Input v-model="search" placeholder="Filter orders…" class="dash-table-search" size="sm">
            <template #start>
              <PhMagnifyingGlass :size="16" />
            </template>
          </Input>
          <Transition name="ui-fade" mode="out-in">
            <span :key="`${count}-${selected.size}`" class="note dash-table-note">
              {{ count }} orders, {{ selected.size }} selected
            </span>
          </Transition>
        </template>
        <template #empty>
          <p class="note dash-table-note">No orders match "{{ search }}".</p>
        </template>
      </DataTable>
    </Card>
    <Transition name="ui-fade">
      <p v-if="lastSelectionCount > 0" class="note dash-selection-readout">
        {{ lastSelectionCount }} order(s) currently selected via <code>@update:selection</code>.
      </p>
    </Transition>
  </div>
</template>

<!--
  `selectable` (built-in checkbox column) replaces the old dashboard's
  manual DataTableSelectCell/DataTableSelectAllHeader composition — that
  escape hatch still exists and is still exercised by DataTableDemo.vue
  elsewhere in this playground, this page just doesn't need it anymore now
  that DataTable owns a built-in option for the common case. `scrollHeight`
  demonstrates the new sticky-header internal scroll on a real, fairly tall
  dataset instead of letting the page itself grow arbitrarily long.

  DataTable itself renders `<tr>` via a plain keyed v-for (no
  TransitionGroup — see its own comment), so a row that a filter removes
  unmounts with its whole subtree in one step and nothing nested inside a
  `#cell` slot can intercept that specific unmount. What the `#cell` hook
  DOES reach: cells that survive a filter change (patched, not unmounted) —
  keying their content on `search` gives every visible row a real cross-fade
  each time the result set changes, which is the honest, achievable version
  of "acknowledge the filter happened" from inside that hook.

  Comment stays outside <template> — see Button.vue for why.
-->
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Card, Column, DataTable, Input, Tag } from 'vael-ui'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { currency, orders, STATUS_VARIANT } from '../data'
import type { Order } from '../data'

const search = shallowRef('')
const filteredOrders = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return orders
  return orders.filter(
    (o) => o.customer.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
  )
})

const lastSelectionCount = shallowRef(0)
function onSelectionChange(rows: Order[]) {
  lastSelectionCount.value = rows.length
}
</script>

<style scoped>
.dash-table-search {
  max-inline-size: 16rem;
}
.dash-table-note {
  margin: 0;
  white-space: nowrap;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
.dash-selection-readout {
  margin: 0;
}

.ui-fade-enter-active,
.ui-fade-leave-active {
  transition: opacity var(--ui-duration-exit) var(--ui-ease-out);
}
.ui-fade-enter-from,
.ui-fade-leave-to {
  opacity: 0;
}
</style>
