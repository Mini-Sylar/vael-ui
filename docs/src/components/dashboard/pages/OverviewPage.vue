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
            viewBox="0 0 100 22"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <circle
              v-for="(dot, i) in ditheredSparkline(stat.sparkline)"
              :key="i"
              :cx="dot.x"
              :cy="dot.y"
              :r="dot.r"
              :fill-opacity="dot.o"
              fill="currentColor"
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
          <Column :data="columnData" field="status" label="Status">
            <template #cell="{ row }">
              <Tag :variant="STATUS_VARIANT[row.status]" size="sm">
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
function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

interface SparkDot {
  x: number
  y: number
  r: number
  o: number
}

// Dithering = varying dot size/opacity, not scattering position (jitter reads as noise).
function ditheredSparkline(values: number[]): SparkDot[] {
  const width = 100
  const height = 20
  const dotsPerSegment = 3
  const dots: SparkDot[] = []
  let seed = 0
  for (let i = 0; i < values.length - 1; i++) {
    const x0 = (i / (values.length - 1)) * width
    const x1 = ((i + 1) / (values.length - 1)) * width
    const y0 = height - values[i]! * height
    const y1 = height - values[i + 1]! * height
    for (let j = 0; j < dotsPerSegment; j++) {
      const t = j / dotsPerSegment
      seed++
      dots.push({
        x: x0 + (x1 - x0) * t,
        y: y0 + (y1 - y0) * t,
        r: 0.7 + hash(seed) * 0.5,
        o: 0.55 + hash(seed + 150) * 0.4,
      })
    }
  }
  return dots
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
  block-size: 1.375rem;
  overflow: visible;
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
