<template>
  <div class="repo">
    <div class="repo-stats">
      <motion.div
        v-for="(stat, i) in stats"
        :key="stat.label"
        :initial="reduce ? false : { opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.35, delay: reduce ? 0 : i * 0.05, ease: [0.22, 1, 0.36, 1] }"
      >
        <Card class="repo-stat">
          <div class="repo-stat-head">
            <span class="repo-label">{{ stat.label }}</span>
            <span class="repo-delta" :data-good="stat.good || undefined">{{ stat.delta }}</span>
          </div>
          <div class="repo-stat-value">{{ stat.value }}</div>
          <div v-if="stat.series" class="repo-stat-chart">
            <DitherArea :values="stat.series" :headroom="1.2" :delay="0.2 + i * 0.05" />
          </div>
          <div v-else class="repo-stat-budget">
            <Progress :value="stat.progress" size="sm" />
          </div>
        </Card>
      </motion.div>
    </div>

    <div class="repo-grid">
      <div class="repo-col">
        <Card class="repo-panel">
          <div class="repo-panel-head">
            <h3 class="repo-h">Throughput</h3>
            <span class="repo-label">7-day average per day</span>
            <span class="repo-legend">
              <span><i class="repo-swatch" />merged</span>
              <span><i class="repo-swatch repo-swatch--dashed" />opened</span>
            </span>
          </div>
          <ThroughputChart ref="chart" />
        </Card>

        <Card id="dash-activity" class="repo-panel">
          <div class="repo-panel-head">
            <h3 class="repo-h">Activity</h3>
            <span class="repo-live"><i />live</span>
          </div>
          <Timeline
            :items="repo.activity"
            :item-key="(event) => event.id"
            :completed="(_, index) => index === 0 && repo.activity[0]?.when === 'now'"
            class="repo-timeline"
          >
            <template #marker="{ item }">
              <Avatar v-if="item.who" :name="people[item.who]" size="sm" class="repo-marker" />
              <span v-else class="repo-marker repo-marker--icon">
                <PhCloudArrowUp :size="12" />
              </span>
            </template>
            <template #item="{ item }">
              <div class="repo-event">
                <span class="repo-event-text">
                  <b v-if="item.who">{{ people[item.who].split(' ')[0] }}</b>
                  <span class="repo-muted">{{ item.verb }}</span>
                  <span v-if="item.pr" class="repo-mono">#{{ item.pr }}</span>
                  <span class="repo-muted repo-event-detail">{{ item.text }}</span>
                  <Tag v-if="item.label" size="sm" variant="muted">{{ item.label }}</Tag>
                </span>
                <span class="repo-mono repo-muted repo-event-when">{{ item.when }}</span>
              </div>
            </template>
          </Timeline>
        </Card>
      </div>

      <div class="repo-col">
        <Card class="repo-panel">
          <div class="repo-panel-head">
            <h3 class="repo-h">Release <span class="repo-mono">v0.4.0</span></h3>
            <Tag size="sm" variant="muted" class="repo-push">minor</Tag>
          </div>
          <ol class="repo-stages">
            <li
              v-for="(stage, i) in RELEASE_STAGES"
              :key="stage"
              :data-state="stageState(i)"
              class="repo-stage"
            >
              <PhCheck v-if="stageState(i) === 'done'" :size="14" weight="bold" />
              <PhCircleDashed v-else-if="stageState(i) === 'current'" :size="14" />
              <PhCircle v-else :size="14" />
              <span>{{ stage }}</span>
              <Transition name="ui-fade" mode="out-in">
                <span :key="stageDetail(i)" class="repo-mono repo-muted repo-push">{{
                  stageDetail(i)
                }}</span>
              </Transition>
            </li>
          </ol>
          <SplitButton
            size="sm"
            :items="shipItems"
            :disabled="repo.approvals < 2"
            class="repo-ship"
            @click="shipOpen = true"
            @select="onShipOption"
          >
            Ship release
          </SplitButton>
          <Dialog
            v-model:open="shipOpen"
            title="Ship v0.4.0"
            description="Publishes to npm, then rolls out to the docs site."
            :container="shell"
            size="sm"
            class="repo-ship-dialog"
          >
            <div class="repo-ship-body">
              <div class="repo-ship-row">
                <span>Docs rollout</span>
                <span class="repo-mono">{{ rollout }}%</span>
              </div>
              <Slider v-model="rollout" :min="10" :max="100" :step="10" aria-label="Rollout" />
              <Switch v-model="notify" label="Post to #releases" />
            </div>
            <template #footer="{ close }">
              <Button variant="ghost" size="sm" @click="close">Cancel</Button>
              <Button size="sm" class="repo-ship-confirm" @click="ship(close)">
                <template #leading><PhRocketLaunch :size="14" /></template>
                Ship
              </Button>
            </template>
          </Dialog>
        </Card>

        <Card class="repo-panel repo-queue">
          <div class="repo-panel-head">
            <h3 class="repo-h">Review queue</h3>
            <span class="repo-mono repo-muted repo-push">{{ openPulls.length }}</span>
          </div>
          <TransitionGroup tag="ul" name="repo-queue" class="repo-queue-list">
            <li v-for="pull in openPulls" :key="pull.id">
              <button type="button" class="repo-queue-row" @click="navigate?.('pulls')">
                <span class="repo-dot" :data-state="pullState(pull)" />
                <span class="repo-queue-title">{{ pull.title }}</span>
                <span class="repo-mono repo-muted">#{{ pull.id }}</span>
              </button>
            </li>
          </TransitionGroup>
          <div class="repo-duty">
            <AvatarGroup size="sm">
              <Avatar :name="people.MM" />
              <Avatar :name="people.EB" />
              <Avatar :name="people.KA" />
            </AvatarGroup>
            <span class="repo-muted">on review duty</span>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, shallowRef } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import {
  Avatar,
  AvatarGroup,
  Button,
  Card,
  Dialog,
  Progress,
  Slider,
  SplitButton,
  Switch,
  Tag,
  Timeline,
  toast,
} from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'
import {
  PhCheck,
  PhCircle,
  PhCircleDashed,
  PhCloudArrowUp,
  PhRocketLaunch,
} from '@phosphor-icons/vue'
import DitherArea from '../DitherArea.vue'
import ThroughputChart from '../ThroughputChart.vue'
import { RELEASE_STAGES, people, repo, throughput } from '../repoData'
import type { PullRequest } from '../repoData'
import { dashboardNavigateKey, dashboardShellKey } from '../dashboardNavigate'

const reduce = useReducedMotion()
const navigate = inject(dashboardNavigateKey, undefined)
const shell = inject(dashboardShellKey, undefined)

const shipOpen = shallowRef(false)
const rollout = shallowRef(20)
const notify = shallowRef(false)

const stats = [
  { label: 'Merged', value: '42', delta: '+18%', good: true, series: throughput.merged.slice(-14) },
  {
    label: 'Deploys',
    value: '99.2%',
    delta: '12 of 12',
    series: [96.8, 97.1, 97, 97.6, 97.9, 97.7, 98.3, 98.6, 98.4, 98.9, 99, 98.9, 99.1, 99.2],
  },
  {
    label: 'Median build',
    value: '1m 48s',
    delta: '−24s',
    good: true,
    series: [140, 138, 142, 131, 128, 126, 122, 124, 118, 116, 112, 113, 110, 108],
  },
  { label: 'Bundle, gzip', value: '31.4 kB', delta: 'budget 40 kB', progress: 78 },
]

const openPulls = computed(() => repo.pulls.filter((p) => p.state === 'open'))

function pullState(pull: PullRequest): 'passed' | 'pending' | 'failed' {
  if (pull.checks.some((c) => c.state === 'failed')) return 'failed'
  if (pull.checks.some((c) => c.state === 'pending')) return 'pending'
  return 'passed'
}

// Build and Test are done; Review completes with the second approval.
function stageState(i: number): 'done' | 'current' | 'upcoming' {
  const reached = repo.approvals >= 2 ? 3 : 2
  return i < reached ? 'done' : i === reached ? 'current' : 'upcoming'
}
function stageDetail(i: number): string {
  return ['1m 48s', '1,122 passed', `${repo.approvals} of 2`, repo.approvals >= 2 ? 'ready' : '—'][
    i
  ]!
}

const shipItems: MenuEntry[] = [
  { label: 'Ship to preview', value: 'preview' },
  { label: 'Schedule for tomorrow', value: 'schedule' },
]
function ship(close: () => void) {
  close()
  const notified = notify.value ? ', #releases notified' : ''
  toast.success(`v0.4.0 is on its way to npm, rolling out to ${rollout.value}%${notified}.`)
}
function onShipOption(item: MenuItemData) {
  toast(item.value === 'preview' ? 'Shipping to preview.' : 'Scheduled for tomorrow, 09:00.')
}
</script>

<style scoped>
.repo {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  font-size: 0.8125rem;
}

.repo-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.625rem;
}
@container dash-main (max-width: 44rem) {
  .repo-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.repo-stat {
  block-size: 100%;
  overflow: hidden;
}
.repo-stat :deep(.ui-card-body) {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  block-size: 100%;
  padding: 0.625rem 0.75rem 0;
}
.repo-stat-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0 0.5rem;
}
.repo-label {
  font-size: 0.6875rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
}
.repo-delta {
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
  white-space: nowrap;
}
.repo-delta[data-good] {
  color: var(--ui-success);
}
.repo-stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
/* Bleeds to the card's edges so the dither runs off the bottom. */
.repo-stat-chart {
  block-size: 2rem;
  margin: 0.25rem -0.75rem 0;
}
.repo-stat-budget {
  margin-block: auto 0.75rem;
}

.repo-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 17rem);
  gap: 0.625rem;
  align-items: start;
}
@container dash-main (max-width: 44rem) {
  .repo-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.repo-col {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  min-inline-size: 0;
}
.repo-panel :deep(.ui-card-body) {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
}
.repo-panel-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-inline-size: 0;
}
.repo-h {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}
.repo-push {
  margin-inline-start: auto;
}
.repo-mono {
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.repo-muted {
  color: var(--ui-text-muted);
}

.repo-legend {
  display: flex;
  gap: 0.75rem;
  margin-inline-start: auto;
  font-size: 0.6875rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
}
.repo-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}
.repo-swatch {
  inline-size: 0.75rem;
  block-size: 2px;
  border-radius: 999px;
  background: var(--ui-text);
}
.repo-swatch--dashed {
  background: repeating-linear-gradient(90deg, var(--ui-text-muted) 0 3px, transparent 3px 6px);
}
@container dash-main (max-width: 36rem) {
  .repo-panel-head > .repo-label {
    display: none;
  }
}

.repo-live {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-inline-start: auto;
  font-size: 0.6875rem;
  color: var(--ui-text-muted);
}
.repo-live i {
  inline-size: 6px;
  block-size: 6px;
  border-radius: 999px;
  background: var(--ui-success);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ui-success) 18%, transparent);
}

.repo-timeline :deep(.ui-timeline-content) {
  padding-block-end: 0.625rem;
}
.repo-marker {
  flex: none;
}
.repo-marker.ui-avatar {
  inline-size: 1.25rem;
  block-size: 1.25rem;
  font-size: 0.5rem;
}
.repo-marker--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  border-radius: 999px;
  background: var(--ui-surface);
  box-shadow: 0 0 0 1px var(--ui-border);
  color: var(--ui-text-muted);
}
.repo-event {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-inline-size: 0;
}
.repo-event-text {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-inline-size: 0;
  white-space: nowrap;
}
.repo-event-text b {
  font-weight: 500;
}
.repo-event-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  min-inline-size: 0;
}
.repo-event-when {
  margin-inline-start: auto;
  flex: none;
}

.repo-stages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.repo-stage {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.repo-stage[data-state='current'] {
  font-weight: 500;
}
.repo-stage[data-state='upcoming'] {
  color: var(--ui-text-muted);
}
.repo-stage[data-state='done'] :deep(svg) {
  color: var(--ui-text);
}
.repo-ship {
  inline-size: 100%;
}
.repo-ship-body {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  font-size: 0.8125rem;
}
.repo-ship-row {
  display: flex;
  justify-content: space-between;
}
.repo-ship :deep(.ui-button:first-child) {
  flex: 1 1 auto;
}

.repo-queue-list {
  list-style: none;
  margin: 0 -0.375rem;
  padding: 0;
  position: relative;
}
.repo-queue-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  inline-size: 100%;
  padding: 0.375rem;
  border: 0;
  border-radius: calc(var(--ui-radius) - 4px);
  background: none;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  transition: background-color var(--ui-duration-press) ease;
}
@media (hover: hover) and (pointer: fine) {
  .repo-queue-row:hover {
    background: var(--ui-muted);
  }
}
.repo-queue-row:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}
.repo-queue-title {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.repo-dot {
  flex: none;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 999px;
  background: var(--ui-success);
}
.repo-dot[data-state='pending'] {
  background: var(--ui-warning);
}
.repo-dot[data-state='failed'] {
  background: var(--ui-danger);
}
/* A merged pull request leaves the queue: fades and collapses, rows below slide up. */
.repo-queue-leave-active {
  position: absolute;
  inline-size: 100%;
  transition: opacity var(--ui-duration-exit) var(--ui-ease-out);
}
.repo-queue-move {
  transition: transform var(--ui-duration-enter) var(--ui-ease-out);
}
.repo-queue-leave-to {
  opacity: 0;
}
.repo-duty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-block-start: 0.5rem;
  border-block-start: 1px solid color-mix(in oklch, var(--ui-border) 60%, transparent);
  font-size: 0.75rem;
}

/* The hero dashboard can be as narrow as ~250px of content: tighter type. */
@container dash-main (max-width: 24rem) {
  .repo {
    font-size: 0.75rem;
  }
  .repo-stat-value {
    font-size: 1rem;
  }
  .repo-stat :deep(.ui-card-body),
  .repo-panel :deep(.ui-card-body) {
    padding-inline: 0.625rem;
  }
  .repo-stat-chart {
    margin-inline: -0.625rem;
  }
  .repo-mono {
    font-size: 0.6875rem;
  }
}
</style>
