<!-- ScrollArea with every part: the root and its viewport, scrolled partway so both edges fade. -->
<template>
  <div data-specimen class="specimen">
    <ScrollArea ref="area" class="area" aria-label="Activity">
      <ul class="list">
        <li v-for="entry in activity" :key="entry">{{ entry }}</li>
      </ul>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { ScrollArea } from 'vael-ui'

const activity = [
  'Ada Lovelace joined the team',
  'Billing email updated',
  'Grace Hopper renamed a project',
  'Team plan renewed',
  'Two seats added',
  'Invoice #1042 paid',
  'Alan Turing left a comment',
  'Workspace logo changed',
  'Export finished',
  'Katherine Johnson joined the team',
]

// Scrolled a little, so content runs under both faded edges.
const area = useTemplateRef('area')
onMounted(() => area.value?.el?.querySelector('.ui-scroll-area-viewport')?.scrollTo({ top: 48 }))
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
.area {
  block-size: 12rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
}
.list {
  margin: 0;
  padding: 0.25rem 1rem;
  list-style: none;
}
.list li {
  padding-block: 0.5rem;
  font-size: 0.875rem;
  border-block-end: 1px solid var(--ui-border);
}
.list li:last-child {
  border-block-end: 0;
}
</style>
