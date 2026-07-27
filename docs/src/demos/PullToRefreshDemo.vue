<template>
  <section class="demo">
    <h2>Pull to refresh</h2>
    <p class="note">
      Headless/thin split, same as <code>useSheetDrag</code> + <code>&lt;BottomSheet&gt;</code>:
      <code>usePullToRefresh</code> is the pointer-driven gesture/state machine (
      <code>idle</code> to <code>pulling</code> to <code>ready</code> to <code>loading</code> to
      <code>done</code>), knowing nothing about markup; <code>&lt;PullToRefresh&gt;</code> renders a
      default bubble-and-arrow indicator on top of it. Pointer events, not touch, works with mouse
      drags too. Drag past the zone's <code>maxPull</code> and it keeps creeping with growing
      rubber-band resistance (a Vaul-style log curve) instead of hitting a wall. The
      <code>#indicator</code> slot replaces the entire default indicator, receiving
      <code>{ state, progress, pullDistance }</code>, a GSAP/motion-v consumer should animate
      <em>inside</em> that slot's own content, never the zone element itself, which is Vue-owned
      structural state (its <code>block-size</code> tracks the drag 1:1).
    </p>

    <h3>Default indicator</h3>
    <PullToRefresh class="ptr-box" :on-refresh="refreshBasic">
      <ul class="ptr-list">
        <li v-for="row in basicRows" :key="row" class="ptr-row">{{ row }}</li>
      </ul>
    </PullToRefresh>

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

const basicRows = shallowRef([
  'Row 1',
  'Row 2',
  'Row 3',
  'Row 4',
  'Row 5',
  'Row 6',
  'Row 7',
  'Row 8',
])
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

async function refreshBasic() {
  await wait(1200)
  basicRows.value = [`New row @ ${new Date().toLocaleTimeString()}`, ...basicRows.value]
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
