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
            <Tag :variant="stat.trendVariant" size="sm" class="dash-stat-trend">{{
              stat.trend
            }}</Tag>
          </div>
          <div class="dash-stat-value">{{ formatStat(stat) }}</div>
          <Progress
            v-if="stat.progress != null"
            :value="stat.progress"
            size="sm"
            :variant="stat.trendVariant === 'danger' ? 'danger' : 'primary'"
            class="dash-stat-progress"
          />
          <svg
            v-else-if="stat.sparkline"
            class="dash-stat-spark"
            :class="`dash-stat-spark--${stat.trendVariant}`"
            :style="{ '--spark-delay': `${reduce ? 0 : 0.2 + i * 0.06}s` }"
            :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient :id="`spark-fill-${i}`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.22" />
                <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="sparkPaths(stat.sparkline).area" :fill="`url(#spark-fill-${i})`" />
            <path
              :d="sparkPaths(stat.sparkline).line"
              class="dash-stat-spark-line"
              vector-effect="non-scaling-stroke"
            />
            <!-- A zero-length round-capped stroke stays a true circle under the stretched viewBox. -->
            <path
              :d="sparkPaths(stat.sparkline).end"
              class="dash-stat-spark-end"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </Card>
      </motion.div>
    </div>

    <Card class="dash-recent-orders-card">
      <template #header>
        <div class="dash-recent-orders-header">
          <div>
            <h3 class="ui-card-title">Recent orders</h3>
            <p class="ui-card-description">Latest 10 — full table lives on the Orders page.</p>
          </div>
          <AvatarGroup size="sm" :overflow-count="teamOverflowCount" hover-lift>
            <Avatar
              v-for="member in visibleTeam"
              :key="member.name"
              :name="member.name"
              size="sm"
              v-tooltip="`${member.name} — ${member.role}`"
            />
          </AvatarGroup>
        </div>
      </template>
      <DataTable :data="recentOrders" row-key="id" size="sm" scroll-height="15rem">
        <template #columns="{ columnData }">
          <Column :data="columnData" field="id" label="Order" />
          <Column :data="columnData" field="customer" label="Customer" />
          <Column :data="columnData" field="amount" label="Amount">
            <template #cell="{ row }">{{ currency.format(row.amount) }}</template>
          </Column>
          <Column :data="columnData" field="status" label="Status" width="6rem">
            <template #cell="{ row }">
              <Tag :variant="STATUS_VARIANT[row.status]" size="sm">
                <template #icon>
                  <PhDot :size="5" class="status-dot" />
                </template>
                {{ row.status }}</Tag
              >
            </template>
          </Column>
        </template>
        <template #footer>
          <button
            id="dash-view-all-link"
            type="button"
            class="dash-view-all-link"
            @click="navigate?.('orders')"
          >
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
import { Avatar, AvatarGroup, Card, Column, DataTable, Progress, Tag, vTooltip } from 'vael-ui'
import { currency, orders, STATUS_VARIANT, stats, teamMembers } from '../data'
import type { StatDef } from '../data'
import { PhDot } from '@phosphor-icons/vue'
import { dashboardNavigateKey } from '../dashboardNavigate'

const navigate = inject(dashboardNavigateKey, null)
const reduce = useReducedMotion()

const recentOrders = computed(() => orders.slice(0, 10))

// Skip index 0 (Mira Mitchell) — already shown as the header's account avatar.
const otherTeamMembers = teamMembers.slice(1)
const TEAM_PRESENCE_COUNT = 2
const visibleTeam = otherTeamMembers.slice(0, TEAM_PRESENCE_COUNT)
const teamOverflowCount = Math.max(otherTeamMembers.length - TEAM_PRESENCE_COUNT, 0)

function formatStat(stat: StatDef): string {
  if (stat.format === 'currency') return currency.format(stat.value)
  if (stat.format === 'percent') return `${stat.value}%`
  return new Intl.NumberFormat('en-US').format(stat.value)
}

// Deterministic (no Math.random — this page SSRs) pseudo-random hash.
const SPARK_W = 100
const SPARK_H = 24
// Leaves room for the stroke and end dot at the top and bottom edges.
const SPARK_PAD = 3

interface SparkPaths {
  line: string
  area: string
  end: string
}

// Monotone cubic interpolation (Fritsch–Carlson): smooth, but never overshoots
// the data the way a plain Catmull-Rom curve does between close points.
function sparkPaths(values: number[]): SparkPaths {
  const n = values.length
  const xs = values.map((_, i) => (i / (n - 1)) * SPARK_W)
  // Each series fills the chart's height, whatever its range.
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  const ys = values.map((v) => SPARK_PAD + (1 - (v - min) / range) * (SPARK_H - SPARK_PAD * 2))
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) slopes.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!))
  const tangents = values.map((_, i) => {
    if (i === 0) return slopes[0]!
    if (i === n - 1) return slopes[n - 2]!
    const a = slopes[i - 1]!
    const b = slopes[i]!
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b)
  })
  let line = `M${xs[0]},${ys[0]}`
  for (let i = 0; i < n - 1; i++) {
    const dx = (xs[i + 1]! - xs[i]!) / 3
    line += ` C${xs[i]! + dx},${ys[i]! + tangents[i]! * dx} ${xs[i + 1]! - dx},${ys[i + 1]! - tangents[i + 1]! * dx} ${xs[i + 1]},${ys[i + 1]}`
  }
  const area = `${line} L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z`
  const end = `M${xs[n - 1]},${ys[n - 1]} h0`
  return { line, area, end }
}
</script>

<style scoped>
.dash-stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.625rem;
  align-items: stretch;
  margin-block-end: 0.625rem;
}
@container dash-main (max-width: 44rem) {
  .dash-stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.dash-stat-card {
  height: 100%;
}
.dash-stat-card :deep(.ui-card-body) {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  height: 100%;
  padding: 0.625rem 0.75rem;
}
.dash-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.dash-stat-label {
  font-size: 0.6875rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
}
.dash-stat-value {
  font-size: 1.125rem;
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

.dash-stat-spark {
  inline-size: 100%;
  block-size: 1.5rem;
  overflow: visible;
  /* Draws in left to right once, as its card lands. */
  animation: dash-spark-reveal 700ms var(--ui-ease-out) var(--spark-delay, 0s) both;
}
.dash-stat-spark-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.dash-stat-spark-end {
  fill: none;
  stroke: currentColor;
  stroke-width: 5;
  stroke-linecap: round;
}
@keyframes dash-spark-reveal {
  from {
    clip-path: inset(-4px 100% -4px -4px);
  }
  to {
    clip-path: inset(-4px -4px -4px -4px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .dash-stat-spark {
    animation: none;
  }
}
.dash-stat-spark--success {
  color: var(--ui-success);
}
.dash-stat-spark--warning {
  color: var(--ui-warning);
}
.dash-stat-spark--danger {
  color: var(--ui-danger);
}

.dash-recent-orders-card {
  min-inline-size: 0;
}
.dash-recent-orders-card :deep(.ui-card-header) {
  padding: 0.75rem 0.75rem 0;
}
.dash-recent-orders-card :deep(.ui-card-title) {
  font-size: 0.9375rem;
}
.dash-recent-orders-card :deep(.ui-card-description) {
  font-size: 0.75rem;
}
.dash-recent-orders-card :deep(.ui-card-body) {
  padding: 0.5rem 0.75rem 0.75rem;
}
.dash-recent-orders-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  inline-size: 100%;
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
