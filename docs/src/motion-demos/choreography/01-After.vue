<template>
  <section class="demo">
    <Button @click="open = true">Weekly report</Button>
    <Dialog v-model:open="open" title="Weekly report" :motion="motion">
      <template #default="{ target }">
        <p :ref="target('summary')" class="summary">23 hours across 4 tasks this week.</p>
        <ul class="rows">
          <li v-for="row in rows" :key="row.name" :ref="target('rows')">
            <span>{{ row.name }}</span>
            <span class="muted">{{ row.hours }} h</span>
          </li>
        </ul>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button, Dialog } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const open = ref(false)
const rows = [
  { name: 'Design review', hours: 6 },
  { name: 'API cleanup', hours: 9 },
  { name: 'Release notes', hours: 3 },
  { name: 'Bug triage', hours: 5 },
]

const motion: DialogMotion<'summary' | 'rows'> = {
  targets: {
    summary: { initial: { opacity: 0, y: 8 } },
    // The rows start when the summary is 60% of the way in.
    rows: { initial: { opacity: 0, y: 6 }, stagger: 0.04, after: 'summary:60%' },
  },
}
</script>

<style scoped>
.summary {
  margin: 0 0 0.75rem;
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.rows li {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-top: 1px solid var(--ui-border);
}
.muted {
  color: var(--ui-text-muted);
}
</style>
