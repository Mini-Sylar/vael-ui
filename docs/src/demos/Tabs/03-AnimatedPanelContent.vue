<template>
  <section class="demo">
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
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
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

// Panel slides with directional momentum; @change fires after Tabs flips v-model
const direction = shallowRef(1)
let previousIndex = items.indexOf(active.value)
function onChange(item: Section) {
  const next = items.indexOf(item)
  direction.value = next > previousIndex ? 1 : -1
  previousIndex = next
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
