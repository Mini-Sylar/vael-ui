<template>
  <section class="demo">
    <h3>Pages</h3>
    <div class="row">
      <SelectButton v-model="page" :items="PAGES" aria-label="Page" size="sm" />
      <SelectButton v-model="swap" :items="SWAPS" aria-label="Swap" size="sm" />
    </div>
    <div class="stage">
      <!-- A new root for each page under one name, as RouterView renders a route. -->
      <article :key="page" v-animate:page="{ ...look, swap }" class="page">
        <h4>{{ current.title }}</h4>
        <p v-for="line in current.lines" :key="line">{{ line }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { SelectButton } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const PAGES = [
  { label: 'Inbox', value: 'inbox' },
  { label: 'Sent', value: 'sent' },
  { label: 'Drafts', value: 'drafts' },
]
const SWAPS = [
  { label: 'Cross', value: 'sync' },
  { label: 'Wait', value: 'wait' },
]
const CONTENT = {
  inbox: {
    title: 'Inbox',
    lines: ['Site visit moved to Thursday', 'New invoice from Harbor Supply'],
  },
  sent: { title: 'Sent', lines: ['Quote for the substation', 'Crew schedule, week 44'] },
  drafts: { title: 'Drafts', lines: ['Safety checklist (unfinished)'] },
}
const page = shallowRef<keyof typeof CONTENT>('inbox')
const swap = shallowRef<'sync' | 'wait'>('sync')
const current = computed(() => CONTENT[page.value])
const look = { initial: { opacity: 0, y: 12 }, exit: { opacity: 0, y: -12 } }
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.stage {
  position: relative;
  min-block-size: 8rem;
  margin-block-start: 1rem;
}
.page {
  display: grid;
  gap: 0.25rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
}
.page h4 {
  margin: 0 0 0.25rem;
}
.page p {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
