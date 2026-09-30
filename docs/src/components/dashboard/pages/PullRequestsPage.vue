<template>
  <div class="prs">
    <Tabs v-model:active="tab" :items="TABS" class="prs-tabs">
      <template #default="{ items: list, itemProps, indicatorProps }">
        <div v-bind="indicatorProps('underline')" />
        <button v-for="item in list" :key="item" v-bind="itemProps(item)">
          {{ item === 'open' ? 'Open' : 'Merged' }}
          <span class="prs-count">{{ counts[item] }}</span>
        </button>
      </template>
    </Tabs>

    <Transition name="ui-fade" mode="out-in">
      <Accordion v-if="shown.length" :key="tab" v-model:value="expanded" class="prs-list">
        <AccordionItem v-for="pull in shown" :key="pull.id" :value="String(pull.id)">
          <template #trigger="{ open }">
            <span class="prs-row">
              <Avatar :name="people[pull.author]" size="sm" class="prs-avatar" />
              <span class="prs-main">
                <span class="prs-title-row">
                  <span class="prs-title">{{ pull.title }}</span>
                  <span class="prs-mono">#{{ pull.id }}</span>
                </span>
                <span class="prs-labels">
                  <Chip v-for="label in pull.labels" :key="label" size="sm" :label="label" />
                </span>
              </span>
              <span class="prs-status" :data-state="statusOf(pull)">
                <i />{{ statusText(pull) }}
              </span>
              <PhCaretDown :size="14" class="prs-chevron" :data-open="open || undefined" />
            </span>
          </template>

          <div v-if="pull.state === 'open'" class="prs-detail">
            <ul class="prs-checks">
              <li v-for="check in pull.checks" :key="check.name" :data-state="check.state">
                <PhCheckCircle v-if="check.state === 'passed'" :size="15" weight="fill" />
                <PhXCircle v-else-if="check.state === 'failed'" :size="15" weight="fill" />
                <Loader v-else size="15px" class="prs-loader" />
                <span class="prs-check-name">{{ check.name }}</span>
                <span class="prs-mono">{{ check.detail }}</span>
              </li>
            </ul>
            <div class="prs-actions">
              <Checkbox v-model="squash" label="Squash and merge" size="sm" />
              <Button
                size="sm"
                :disabled="statusOf(pull) !== 'passed'"
                class="prs-merge"
                @click="merge(pull)"
              >
                <template #leading><PhGitMerge :size="14" /></template>
                Approve and merge
              </Button>
            </div>
          </div>
          <p v-else class="prs-merged-note">
            Merged into <span class="prs-mono">main</span> by {{ people.MM }}.
          </p>
        </AccordionItem>
      </Accordion>
      <p v-else :key="`${tab}-empty`" class="prs-empty">Nothing left to review.</p>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import {
  Accordion,
  AccordionItem,
  Avatar,
  Button,
  Checkbox,
  Chip,
  Loader,
  Tabs,
  toast,
} from 'vael-ui'
import { PhCaretDown, PhCheckCircle, PhGitMerge, PhXCircle } from '@phosphor-icons/vue'
import { mergePull, people, repo } from '../repoData'
import type { PullRequest } from '../repoData'

type Tab = 'open' | 'merged'
const TABS: Tab[] = ['open', 'merged']

const tab = shallowRef<Tab>('open')
const expanded = shallowRef<string | null>(null)
const squash = shallowRef(true)

const counts = computed(() => ({
  open: repo.pulls.filter((p) => p.state === 'open').length,
  merged: repo.pulls.filter((p) => p.state === 'merged').length,
}))
const shown = computed(() => repo.pulls.filter((p) => p.state === tab.value))

function statusOf(pull: PullRequest): 'passed' | 'pending' | 'failed' | 'merged' {
  if (pull.state === 'merged') return 'merged'
  if (pull.checks.some((c) => c.state === 'failed')) return 'failed'
  if (pull.checks.some((c) => c.state === 'pending')) return 'pending'
  return 'passed'
}
function statusText(pull: PullRequest): string {
  return {
    passed: 'Checks passed',
    pending: 'Running',
    failed: '1 failing',
    merged: 'Merged',
  }[statusOf(pull)]
}

function merge(pull: PullRequest) {
  mergePull(pull.id)
  expanded.value = null
  toast.success(`#${pull.id} merged into main.`, {
    action: { label: 'View', onClick: () => (tab.value = 'merged') },
  })
}
</script>

<style scoped>
.prs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
.prs-tabs {
  border-block-end: 1px solid var(--ui-border);
}
.prs-count {
  margin-inline-start: 0.25rem;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}

.prs-list {
  display: flex;
  flex-direction: column;
}
.prs-list :deep(.ui-accordion-item) {
  border-block-end: 1px solid color-mix(in oklch, var(--ui-border) 70%, transparent);
}
.prs-list :deep(.ui-accordion-trigger) {
  padding-block: 0.625rem;
}
.prs-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  inline-size: 100%;
  min-inline-size: 0;
  text-align: start;
}
.prs-avatar {
  flex: none;
}
.prs-main {
  display: flex;
  flex-direction: column;
  gap: 0.3125rem;
  min-inline-size: 0;
  flex: 1 1 auto;
}
.prs-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  min-inline-size: 0;
}
.prs-title-row .prs-mono {
  flex: none;
}
.prs-title {
  min-inline-size: 0;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prs-mono {
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.75rem;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}
.prs-labels {
  display: flex;
  gap: 0.25rem;
}
.prs-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex: none;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
}
.prs-status i {
  inline-size: 6px;
  block-size: 6px;
  border-radius: 999px;
  background: var(--ui-success);
}
.prs-status[data-state='pending'] i {
  background: var(--ui-warning);
}
.prs-status[data-state='failed'] i {
  background: var(--ui-danger);
}
.prs-status[data-state='merged'] i {
  background: var(--ui-text);
}
.prs-chevron {
  flex: none;
  color: var(--ui-text-muted);
  transition: rotate var(--ui-duration-enter) var(--ui-ease-out);
}
.prs-chevron[data-open] {
  rotate: 180deg;
}
@container dash-main (max-width: 36rem) {
  .prs-status {
    display: none;
  }
}

.prs-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 1rem;
  padding: 0 0 0.875rem 2.75rem;
}
@container dash-main (max-width: 36rem) {
  .prs-detail {
    grid-template-columns: minmax(0, 1fr);
    padding-inline-start: 0;
  }
}
.prs-checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4375rem;
}
.prs-checks li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.prs-checks li > .prs-mono {
  margin-inline-start: auto;
  flex: none;
}
.prs-check-name {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prs-checks li > :first-child {
  flex: none;
}
.prs-checks li[data-state='passed'] > :first-child {
  color: var(--ui-success);
}
.prs-checks li[data-state='failed'] > :first-child {
  color: var(--ui-danger);
}
.prs-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.625rem;
}
.prs-merged-note,
.prs-empty {
  margin: 0;
  padding: 0 0 0.875rem 2.75rem;
  color: var(--ui-text-muted);
}
.prs-empty {
  padding: 1.5rem 0;
  text-align: center;
}

@container dash-main (max-width: 24rem) {
  .prs {
    font-size: 0.75rem;
  }
  .prs-row {
    gap: 0.5rem;
  }
  .prs-mono {
    font-size: 0.6875rem;
  }
}
</style>
