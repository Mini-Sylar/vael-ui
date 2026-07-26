<template>
  <Card>
    <template #header>
      <div class="dash-customers-header">
        <div>
          <h3 class="ui-card-title">Customers</h3>
          <Transition name="ui-fade" mode="out-in">
            <p :key="segmentFilter ?? 'all'" class="ui-card-description">
              {{ filteredCustomers.length }} of {{ customers.length }} customers.
            </p>
          </Transition>
        </div>
        <Combobox
          v-model="segmentFilter"
          :items="segmentItems"
          placeholder="Filter by segment…"
          clearable
          class="dash-segment-filter"
        />
      </div>
    </template>

    <DataTable :data="filteredCustomers" row-key="id" stacked-breakpoint="42rem">
      <template #columns="{ columnData }">
        <Column :data="columnData" field="name" label="Customer" sortable />
        <Column :data="columnData" field="country" label="Country" sortable />
        <Column :data="columnData" field="segment" label="Segment">
          <template #cell="{ row }">
            <Transition name="ui-fade" mode="out-in">
              <Tag :key="segmentFilter ?? 'all'" :variant="SEGMENT_VARIANT[row.segment]">
                {{ row.segment }}
              </Tag>
            </Transition>
          </template>
        </Column>
        <Column :data="columnData" field="tags" label="Tags">
          <template #cell="{ row }">
            <Transition name="ui-fade" mode="out-in">
              <span :key="segmentFilter ?? 'all'" class="dash-tag-list">
                <Chip v-for="tag in row.tags" :key="tag" :label="tag" size="sm" />
              </span>
            </Transition>
          </template>
        </Column>
        <Column :data="columnData" field="lifetimeValue" label="Lifetime value" sortable>
          <template #cell="{ row }">
            <Transition name="ui-fade" mode="out-in">
              <span :key="segmentFilter ?? 'all'">{{ currency.format(row.lifetimeValue) }}</span>
            </Transition>
          </template>
        </Column>
        <Column :data="columnData" field="orders" label="Orders" sortable />
      </template>

      <template #empty>
        <p class="note">No customers in this segment.</p>
      </template>
    </DataTable>
  </Card>
</template>

<!--
  `stackedBreakpoint` is the showcase here: below 42rem this table switches
  to a stacked card layout (each row a label:value block) instead of
  overflowing sideways — resize the window/viewport to see it, or check the
  agent report's own live-verification screenshot. The segment filter is a
  real Combobox (single-select, clearable), not a hand-rolled <select>.

  Cell content keyed on `segmentFilter` (see OrdersPage.vue's comment for
  why: DataTable's own `<tr>` v-for has no TransitionGroup, so a row a
  filter removes can't be animated from a `#cell` slot — surviving rows'
  cells can, and do here).

  Comment stays outside <template> — see Button.vue for why.
-->
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Card, Chip, Column, Combobox, DataTable, Tag } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'
import { currency, customers } from '../data'
import type { Customer } from '../data'

const SEGMENT_VARIANT: Record<Customer['segment'], 'success' | 'muted' | 'warning'> = {
  enterprise: 'success',
  growth: 'muted',
  starter: 'warning',
}

const segmentItems: SelectItemData[] = [
  { label: 'Enterprise', value: 'enterprise' },
  { label: 'Growth', value: 'growth' },
  { label: 'Starter', value: 'starter' },
]
const segmentFilter = shallowRef<string | number | null>(null)

const filteredCustomers = computed(() => {
  if (!segmentFilter.value) return customers
  return customers.filter((c) => c.segment === segmentFilter.value)
})
</script>

<style scoped>
.dash-customers-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  inline-size: 100%;
}
.dash-segment-filter {
  inline-size: 12rem;
  flex: none;
}
.dash-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
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
