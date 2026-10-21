<template>
  <section class="demo">
    <h3>How every highlight moves</h3>
    <p class="note">
      <code>indicator</code> sets how every sliding indicator inside moves: the hover highlight in
      lists and menus, and the selection in Tabs, SelectButton and MenuList. <code>'glide'</code> is
      the default; <code>'instant'</code> keeps the highlight without motion; an object is a spring,
      <code>{ damping, response }</code>, where damping below 1 overshoots. Pick one, then hover the
      tabs and rows and change the selection.
    </p>
    <div class="row">
      <SelectButton
        v-model="choice"
        :items="choices"
        :allow-empty="false"
        size="sm"
        aria-label="Indicator mode"
      />
    </div>
    <code class="snippet">&lt;ConfigProvider :indicator="{{ snippet }}"&gt;</code>
    <ConfigProvider :indicator="modes[choice]">
      <div class="stage">
        <Tabs v-model:active="tab" :items="['overview', 'activity', 'settings']">
          <template #default="{ items, itemProps, indicatorProps }">
            <span v-bind="indicatorProps('underline')" />
            <button v-for="item in items" :key="item" v-bind="itemProps(item)">
              {{ item[0]!.toUpperCase() + item.slice(1) }}
            </button>
          </template>
        </Tabs>
        <SelectButton v-model="range" :items="ranges" :allow-empty="false" aria-label="Range" />
        <div class="list-frame">
          <MenuList :items="folders" active="inbox" aria-label="Folders" />
        </div>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ConfigProvider, MenuList, SelectButton, Tabs } from 'vael-ui'
import type { IndicatorMode } from 'vael-ui'

const modes: Record<string, IndicatorMode> = {
  glide: 'glide',
  instant: 'instant',
  crisp: { damping: 1, response: 0.25 },
  jelly: { damping: 0.5, response: 0.35 },
}
const choices = [
  { label: 'Glide', value: 'glide' },
  { label: 'Instant', value: 'instant' },
  { label: 'Crisp spring', value: 'crisp' },
  { label: 'Jelly spring', value: 'jelly' },
]
const choice = shallowRef('jelly')
const snippet = computed(() => {
  const mode = modes[choice.value]!
  return typeof mode === 'string'
    ? `'${mode}'`
    : `{ damping: ${mode.damping}, response: ${mode.response} }`
})

const tab = shallowRef('overview')
const range = shallowRef('week')
const ranges = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
]
const folders = [
  { label: 'Inbox', value: 'inbox' },
  { label: 'Starred', value: 'starred' },
  { label: 'Sent', value: 'sent' },
  { label: 'Drafts', value: 'drafts' },
  { label: 'Archive', value: 'archive' },
]
</script>

<style scoped>
.row {
  margin-block-end: 0.75rem;
}
.snippet {
  display: inline-block;
  margin-block-end: 1rem;
  font-size: 0.8125rem;
}
.stage {
  display: grid;
  justify-items: start;
  gap: 1.25rem;
}
.list-frame {
  inline-size: 16rem;
  padding: 0.375rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
</style>
