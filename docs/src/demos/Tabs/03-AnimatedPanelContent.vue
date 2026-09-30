<template>
  <section class="demo">
    <h3>Animated panel content (motion-v)</h3>
    <p class="note">
      The panels aren't part of Tabs, they're ordinary consumer markup. Every panel stays mounted
      and motion-v animates each one's <code>x</code>/<code>opacity</code> from its position
      relative to <code>active</code>, so the outgoing and incoming panels cross fade with a
      directional slide. No <code>AnimatePresence</code>: a keyed swap inside it loses its key in a
      Vapor parent, so exits never ran there. <code>id-base</code> wires each tab's
      <code>aria-controls</code> to its panel.
    </p>
    <Tabs v-model:active="active" :items="items" id-base="report">
      <template #default="{ items: list, itemProps }">
        <button v-for="item in list" :key="item" v-bind="itemProps(item)">
          <span class="tab-label">{{ item }}</span>
        </button>
      </template>
    </Tabs>
    <div class="panel-viewport">
      <motion.div
        v-for="(item, index) in items"
        :id="`report-panel-${item}`"
        :key="item"
        class="panel-content"
        role="tabpanel"
        :aria-labelledby="`report-tab-${item}`"
        :tabindex="item === active ? 0 : -1"
        :inert="item !== active"
        :initial="false"
        :animate="{ x: offsetOf(index), opacity: item === active ? 1 : 0 }"
        :transition="{ type: 'spring', duration: 0.4, bounce: 0.2 }"
      >
        <h3>{{ panels[item].title }}</h3>
        <p class="panel-text">{{ panels[item].body }}</p>
      </motion.div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { motion } from 'motion-v'
import { Tabs } from 'vael-ui'

type Section = 'overview' | 'analytics' | 'settings'
const items: Section[] = ['overview', 'analytics', 'settings']

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

// Panels before the active one wait off to the left, later ones to the right,
// so switching tabs slides in the direction of travel.
function offsetOf(index: number) {
  const activeIndex = items.indexOf(active.value)
  return index === activeIndex ? 0 : index < activeIndex ? -48 : 48
}
</script>

<style scoped>
.tab-label {
  display: inline-block;
}
.panel-viewport {
  position: relative;
  overflow: hidden;
  block-size: 8rem;
  margin-block-start: 1rem;
}
.panel-content {
  position: absolute;
  inset: 0;
  padding: 1rem;
}
.panel-text {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
