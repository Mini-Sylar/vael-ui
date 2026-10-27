<template>
  <section class="demo">
    <h3>A date column with <code>#opposite</code></h3>
    <p class="note">
      <code>#opposite</code> renders on the other side of the line from <code>#item</code>, for a
      date or a status. Leave it out, as the other examples do, and the row keeps the plain marker
      and content layout with no empty column.
    </p>
    <Timeline :items="releases">
      <template #opposite="{ item }">{{ item.date }}</template>
      <template #item="{ item }">
        <p class="entry-title">{{ item.title }}</p>
        <p class="entry-summary">{{ item.summary }}</p>
      </template>
    </Timeline>
  </section>
</template>

<script setup lang="ts">
import { Timeline } from 'vael-ui'

interface Release {
  date: string
  title: string
  summary: string
}

const releases: Release[] = [
  {
    date: 'May 2025',
    title: 'Release channels',
    summary: 'Staged rollouts for beta and enterprise cohorts.',
  },
  {
    date: 'Apr 2025',
    title: 'AI assist',
    summary: 'Workspace summaries and faster review suggestions.',
  },
  { date: 'Mar 2025', title: 'Theme studio', summary: 'Token previews and one-click CSS export.' },
]
</script>

<style scoped>
.entry-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
}
.entry-summary {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
