<template>
  <section class="demo">
    <h3>Along a wide target, with markup</h3>
    <p class="note">
      <code>follow</code> keeps the tooltip over the pointer as it moves along a long bar, instead
      of the bar's middle. A component as <code>content</code>, with its <code>props</code>, shows
      markup in the one shared tooltip, so it still opens at once and glides from bar to bar.
    </p>
    <div class="bars">
      <div
        v-for="project in projects"
        :key="project.name"
        v-tooltip="{ content: BarTip, props: project, follow: true }"
        class="bar"
        tabindex="0"
        :style="{
          marginInlineStart: `${project.start}%`,
          inlineSize: `${project.width}%`,
          background: project.color,
        }"
      >
        {{ project.name }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { vTooltip } from 'vael-ui'
import BarTip from './BarTip.vue'

const projects = [
  {
    name: 'Website redesign',
    status: 'On track',
    color: 'oklch(0.7 0.14 150)',
    dates: 'Mar 3 – Sep 26',
    percent: 62,
    start: 0,
    width: 92,
  },
  {
    name: 'Mobile app',
    status: 'At risk',
    color: 'oklch(0.78 0.14 80)',
    dates: 'May 12 – Aug 1',
    percent: 35,
    start: 30,
    width: 45,
  },
  {
    name: 'Billing migration',
    status: 'Off track',
    color: 'oklch(0.65 0.18 25)',
    dates: 'Jun 2 – Dec 19',
    percent: 18,
    start: 40,
    width: 60,
  },
]
</script>

<style scoped>
.bars {
  display: grid;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.bar {
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  color: oklch(0.2 0 0);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}
.bar:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
</style>
