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
    <div class="dash-overview-grid">
      <Card
        title="Recent orders"
        description="Latest 8 — full table lives on the Orders page."
        class="dash-recent-orders-card"
      >
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
                    <!-- simple dot -->
                    <PhDot :size="5" class="status-dot" />
                  </template>
                  {{ row.status }}</Tag
                >
              </template>
            </Column>
            <Column :data="columnData" field="date" label="Date" />
          </template>
          <template #footer>
            <RouterLink id="dash-view-all-link" to="/orders" class="dash-view-all-link"
              >View all orders →</RouterLink
            >
          </template>
        </DataTable>
      </Card>

      <Card
        title="Active team"
        description="Who has access to this workspace."
        class="dash-team-card"
      >
        <AvatarGroup :overflow-count="overflowCount" hover-lift class="dash-team-avatars">
          <Avatar
            v-for="member in visibleTeam"
            :key="member.name"
            :name="member.name"
            size="md"
            v-tooltip="`${member.name} — ${member.role}`"
          />
        </AvatarGroup>
        <p class="dash-team-note">{{ teamMembers.length }} teammates have access right now.</p>
      </Card>
    </div>
  </div>
</template>

<!--
  Stat cards stagger in via motion-v's declarative <motion.div> — the same
  pattern BouncyAccordionDemo.vue already establishes for this playground
  (an initial/animate/transition triple, `useReducedMotion` gating the
  initial offset to `false` instead of hiding the reduced-motion respect
  behind a duration of 0). None of this required any change to Card or
  DataTable: motion-v owns a wrapper element around each Card, never a
  property Card itself manages, so there's zero conflict — the same
  "Vue-managed structural styles and imperative animation libraries never
  share an element" rule this codebase applies everywhere else.

  Comment stays outside <template> — see Button.vue for why.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { motion, useReducedMotion } from 'motion-v'
import { Avatar, AvatarGroup, Card, Column, DataTable, Progress, Tag, vTooltip } from 'vael-ui'
import { currency, orders, STATUS_VARIANT, stats, teamMembers } from '../data'
import type { StatDef } from '../data'
import { PhDot } from '@phosphor-icons/vue'

const reduce = useReducedMotion()

const recentOrders = computed(() => orders.slice(0, 8))

const VISIBLE_TEAM_COUNT = 5
const visibleTeam = computed(() => teamMembers.slice(0, VISIBLE_TEAM_COUNT))
const overflowCount = computed(() => Math.max(teamMembers.length - VISIBLE_TEAM_COUNT, 0))

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
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ui-primary);
  text-decoration: none;
}
.dash-view-all-link:hover {
  text-decoration: underline;
}

/* Asymmetric on purpose: the table is the thing worth scanning, the team
   widget is a glance. A 50/50 split would waste the table's own width. */
.dash-overview-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.875rem;
  align-items: start;
}
@media (max-width: 40rem) {
  .dash-overview-grid {
    grid-template-columns: 1fr;
  }
}

.dash-recent-orders-card {
  min-inline-size: 0;
}

.dash-team-card :deep(.ui-card-body) {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.dash-team-avatars {
  /* hoverLift needs room to actually lift into, or the earliest avatars in
     the row clip against the card's own edge the instant they rise. */
  padding-block-start: 0.25rem;
}
.dash-team-note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
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
