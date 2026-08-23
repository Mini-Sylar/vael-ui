<template>
  <section class="demo">
    <h2>Tabs</h2>
    <p class="note">
      Tabs ships zero indicator markup or logic of its own, you render every
      <code>role="tab"</code> button yourself in the <code>#default</code> slot. Arrow keys move
      selection and wrap at the ends. The sections below are independent, each shows one way to
      render the tab bar or its content, pick whichever fits and ignore the rest.
    </p>

    <h3>Sliding indicator (built in via <code>itemProps</code>/<code>indicatorProps</code>)</h3>
    <p class="note">
      The <code>#default</code> slot hands back <code>itemProps(item)</code> — the full
      <code>role</code>/<code>aria-selected</code>/roving-<code>tabindex</code>/click wiring, spread
      with <code>v-bind</code> onto whatever element you render — and
      <code>indicatorProps(variant)</code> for the optional sliding highlight, measured internally
      via <code>useTabIndicator()</code>. Two variants shown here, <code>'background'</code> (the
      default) and <code>'underline'</code>; both are plain classes if you'd rather style your own.
    </p>
    <div class="row">
      <Tabs v-model:active="bgActive" :items="items">
        <template #default="{ items: list, itemProps, indicatorProps }">
          <div v-bind="indicatorProps()" />
          <button v-for="item in list" :key="item" v-bind="itemProps(item)">
            <span class="tab-label">{{ item }}</span>
          </button>
        </template>
      </Tabs>

      <Tabs v-model:active="underlineActive" :items="items">
        <template #default="{ items: list, itemProps, indicatorProps }">
          <div v-bind="indicatorProps('underline')" />
          <button v-for="item in list" :key="item" v-bind="itemProps(item)">
            <span class="tab-label">{{ item }}</span>
          </button>
        </template>
      </Tabs>
    </div>

    <h3>Custom indicator animation (motion-v)</h3>
    <p class="note">
      Same zero-ownership contract, reached for a spring instead of the CSS default: a
      <code>motion.span</code> with a shared <code>layout-id</code> per tab, no composable needed.
      Quick, near-flat spring (duration 0.45s, bounce 0.15), no playful overshoot on a control
      pressed this often.
    </p>
    <div class="row">
      <Tabs v-model:active="springActive" :items="items">
        <template #default="{ active: current, items: list, itemProps }">
          <button v-for="item in list" :key="item" v-bind="itemProps(item)">
            <motion.span
              v-if="current === item"
              layout-id="tab-indicator"
              class="tab-indicator"
              :transition="{ type: 'spring', duration: 0.45, bounce: 0.15 }"
            />
            <span class="tab-label">{{ item }}</span>
          </button>
        </template>
      </Tabs>
    </div>

    <h3>Animated panel content (motion-v)</h3>
    <p class="note">
      The panel below isn't part of Tabs at all, it's ordinary consumer markup keyed by
      <code>active</code>, wrapped in <code>AnimatePresence</code> so the outgoing and incoming
      panel cross fade with a directional slide (forward when moving to a later tab, backward when
      moving to an earlier one). Tabs has zero awareness this is happening.
    </p>
    <Tabs v-model:active="active" :items="items" @change="onChange">
      <template #default="{ items: list, itemProps }">
        <button v-for="item in list" :key="item" v-bind="itemProps(item)">
          <span class="tab-label">{{ item }}</span>
        </button>
      </template>
    </Tabs>
    <div class="panel-viewport">
      <AnimatePresence :initial="false">
        <motion.div
          :key="active"
          class="panel-content"
          :initial="{ x: direction * 48, opacity: 0 }"
          :animate="{ x: 0, opacity: 1 }"
          :exit="{ x: direction * -48, opacity: 0 }"
          :transition="{ type: 'spring', duration: 0.4, bounce: 0.2 }"
        >
          <h3>{{ panels[active].title }}</h3>
          <p class="panel-text">{{ panels[active].body }}</p>
        </motion.div>
      </AnimatePresence>
    </div>

    <h3>Disabled items and manual activation</h3>
    <p class="note">
      <code>activation="manual"</code>: arrow keys only move focus (tracked via the
      <code>focused</code> slot prop, driving tabindex here), Enter/Space commits. "Archived" is
      disabled and gets skipped over by arrow/Home/End navigation entirely.
    </p>
    <Tabs v-model:active="manualActive" :items="manualItems" activation="manual">
      <template #default="{ items: list, itemProps }">
        <button
          v-for="item in list"
          :key="item"
          class="ui-tabs-item--static"
          :aria-disabled="item === 'archived' || undefined"
          :disabled="item === 'archived'"
          v-bind="itemProps(item)"
        >
          <span class="tab-label">{{ item }}</span>
        </button>
      </template>
    </Tabs>
    <p class="panel-text">Selected: {{ manualActive }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { Tabs } from 'vael-ui'

type Section = 'overview' | 'analytics' | 'settings'
const items: Section[] = ['overview', 'analytics', 'settings']

const bgActive = shallowRef<Section>('overview')
const underlineActive = shallowRef<Section>('overview')

const springActive = shallowRef<Section>('overview')

const active = shallowRef<Section>('overview')
const panels: Record<Section, { title: string; body: string }> = {
  overview: {
    title: 'Overview',
    body: 'Revenue, active users, and the week-over-week delta, the numbers that open a standup.',
  },
  analytics: {
    title: 'Analytics',
    body: 'Funnel breakdown by source, with a cohort retention curve underneath.',
  },
  settings: {
    title: 'Settings',
    body: 'Workspace name, billing plan, and the danger-zone delete-workspace action.',
  },
}

// Panel slides with directional momentum; @change fires after Tabs flips v-model
const direction = shallowRef(1)
let previousIndex = items.indexOf(active.value)
function onChange(item: Section) {
  const next = items.indexOf(item)
  direction.value = next > previousIndex ? 1 : -1
  previousIndex = next
}

const manualItems = ['inbox', 'sent', 'archived', 'drafts']
const manualActive = shallowRef('inbox')
</script>
