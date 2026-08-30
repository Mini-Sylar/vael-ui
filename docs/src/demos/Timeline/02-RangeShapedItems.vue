<template>
  <section class="demo">
    <h3>A completely different item shape: a start/end range</h3>
    <p class="note">
      No <code>date</code> field anywhere — each item spans a range instead of a single point in
      time. Same component, just a different <code>#item</code> slot.
    </p>
    <Timeline :items="sprints">
      <template #item="{ item }">
        <p class="step-title">{{ item.name }}</p>
        <p class="step-range">{{ item.start }} – {{ item.end }}</p>
      </template>
    </Timeline>
  </section>
</template>

<script setup lang="ts">
import { Timeline } from 'vael-ui'

interface Sprint {
  name: string
  start: string
  end: string
}

const sprints: Sprint[] = [
  { name: 'Sprint 12', start: 'Aug 1', end: 'Aug 14' },
  { name: 'Sprint 13', start: 'Aug 15', end: 'Aug 28' },
  { name: 'Sprint 14', start: 'Aug 29', end: 'Sep 11' },
]
</script>

<style scoped>
.step-title {
  margin: 0 0 0.125rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
}
.step-range {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
