<template>
  <section class="demo">
    <Button @click="open = true">Open report</Button>
    <Dialog v-model:open="open" title="Weekly report" :motion="motion">
      <template #default="{ target }">
        <p :ref="target('note')" class="note-line">Saved</p>
        <ul class="rows">
          <li v-for="row in rows" :key="row" :ref="target('rows')">{{ row }}</li>
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
const rows = ['Design review', 'API cleanup', 'Release notes', 'Bug triage']

const motion: DialogMotion<'rows' | 'note'> = {
  targets: {
    rows: { initial: { opacity: 0, y: 6 }, stagger: 0.06 },
    note: {
      initial: { opacity: 0, y: 8 },
      steps: [
        // Comes in, then holds half faded.
        { to: { opacity: 0.5, y: 0 }, duration: 250 },
        // Finishes once the rows have settled.
        { after: 'rows:settle', duration: 250 },
      ],
    },
  },
}
</script>

<style scoped>
.note-line {
  margin: 0 0 0.75rem;
  color: var(--ui-text-muted);
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.rows li {
  padding: 0.5rem 0;
  border-top: 1px solid var(--ui-border);
}
</style>
