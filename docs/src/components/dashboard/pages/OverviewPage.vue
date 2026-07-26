<template>
  <div>
    <div class="dash-stats-row">
      <motion.div
        v-for="(stat, i) in stats"
        :key="stat.label"
        :initial="reduce ? false : { opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{
          duration: 0.35,
          delay: reduce ? 0 : i * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }"
      >
        <Card class="dash-stat-card">
          <div class="dash-stat-head">
            <span class="dash-stat-label">{{ stat.label }}</span>
            <Tag :variant="stat.trendVariant" class="dash-stat-trend">{{ stat.trend }}</Tag>
          </div>
          <div class="dash-stat-value">{{ formatStat(stat) }}</div>
          <Progress
            v-if="stat.progress != null"
            :value="stat.progress"
            size="sm"
            :variant="stat.trendVariant === 'danger' ? 'danger' : 'primary'"
            class="dash-stat-progress"
          />
        </Card>
      </motion.div>
    </div>
    <Card title="Recent orders" description="Latest 8 — full table lives on the Orders page.">
      <DataTable :data="recentOrders" row-key="id">
        <template #columns="{ columnData }">
          <Column :data="columnData" field="id" label="Order" />
          <Column :data="columnData" field="customer" label="Customer" />
          <Column :data="columnData" field="amount" label="Amount">
            <template #cell="{ row }">{{ currency.format(row.amount) }}</template>
          </Column>
          <Column :data="columnData" field="status" label="Status">
            <template #cell="{ row }">
              <Tag :variant="STATUS_VARIANT[row.status]">
                <template #icon>
                  <PhDot :size="5" class="status-dot" />
                </template>
                {{ row.status }}</Tag
              >
            </template>
          </Column>
          <Column :data="columnData" field="date" label="Date" />
        </template>
        <template #footer>
          <button type="button" class="dash-view-all-link" @click="navigate?.('orders')">
            View all orders →
          </button>
        </template>
      </DataTable>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { Card, Column, DataTable, Progress, Tag } from 'vael-ui'
import { currency, orders, STATUS_VARIANT, stats } from '../data'
import type { StatDef } from '../data'
import { PhDot } from '@phosphor-icons/vue'
import { dashboardNavigateKey } from '../dashboardNavigate'

const navigate = inject(dashboardNavigateKey, null)
const reduce = useReducedMotion()

const recentOrders = computed(() => orders.slice(0, 8))

function formatStat(stat: StatDef): string {
  if (stat.format === 'currency') return currency.format(stat.value)
  if (stat.format === 'percent') return `${stat.value}%`
  return new Intl.NumberFormat('en-US').format(stat.value)
}
</script>

<style scoped>
.dash-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 0.875rem;
}
.dash-stat-card :deep(.ui-card-body) {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.dash-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.dash-stat-label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
.dash-stat-value {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.dash-view-all-link {
  border: 0;
  background: none;
  padding: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ui-primary);
  text-decoration: none;
  cursor: pointer;
}
.dash-view-all-link:hover {
  text-decoration: underline;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: currentColor;
  display: inline-block;
  line-height: 0;
}
</style>
