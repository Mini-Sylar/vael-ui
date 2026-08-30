<template>
  <section class="demo">
    <h3>Custom <code>#indicator</code> slot</h3>
    <p class="note">Fully consumer-owned, no bubble, no arrow, just a progress-driven bar.</p>
    <PullToRefresh class="ptr-box" :on-refresh="refreshCustom">
      <template #indicator="{ state, progress }">
        <div class="ptr-custom-indicator">
          <div class="ptr-custom-track">
            <div class="ptr-custom-fill" :style="{ inlineSize: `${progress * 100}%` }" />
          </div>
          <span class="ptr-custom-label">{{ customLabel(state) }}</span>
        </div>
      </template>
      <ul class="ptr-list">
        <li v-for="row in customRows" :key="row" class="ptr-row">{{ row }}</li>
      </ul>
    </PullToRefresh>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PullToRefresh } from 'vael-ui'
import type { PullToRefreshState } from 'vael-ui'

const customRows = shallowRef([
  'Item A',
  'Item B',
  'Item C',
  'Item D',
  'Item E',
  'Item F',
  'Item G',
])

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function refreshCustom() {
  await wait(1200)
  customRows.value = [`New item @ ${new Date().toLocaleTimeString()}`, ...customRows.value]
}

function customLabel(state: PullToRefreshState): string {
  switch (state) {
    case 'ready':
      return 'Release!'
    case 'loading':
      return 'Working…'
    case 'done':
      return 'Done!'
    default:
      return 'Pull down'
  }
}
</script>

<style scoped>
.ptr-box {
  block-size: 320px;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  margin-block-end: 1.5rem;
}
.ptr-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ptr-row {
  padding: 0.75rem 1rem;
  border-block-end: 1px solid var(--ui-border);
  font-size: 0.875rem;
}
.ptr-custom-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  inline-size: 10rem;
}
.ptr-custom-track {
  inline-size: 100%;
  block-size: 4px;
  border-radius: 99px;
  background: var(--ui-muted);
  overflow: hidden;
}
.ptr-custom-fill {
  block-size: 100%;
  background: var(--ui-primary);
}
.ptr-custom-label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
</style>
