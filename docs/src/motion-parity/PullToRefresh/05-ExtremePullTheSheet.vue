<template>
  <section class="demo">
    <h3>Extreme: pull the page down like a sheet</h3>
    <p class="note">
      The content is a sheet lying on a tray. Pull it and it comes away from the top: its corners
      round, it lifts and its shadow deepens, all from the exposed <code>progress</code>. It stays
      up while the spinner shows, then springs back on a <code>useSpringValue</code> spring, with a
      little bounce as it settles.
    </p>
    <div class="tray">
      <PullToRefresh ref="ptr" class="tray-scroll" :on-refresh="refresh">
        <template #indicator="{ state }">
          <div class="tray-indicator">
            <Loader v-if="state === 'loading'" size="1.125rem" />
            <span v-else>{{ state === 'ready' ? 'Let go to refresh' : 'Pull to refresh' }}</span>
          </div>
        </template>
        <div class="sheet" :style="sheetStyle">
          <span class="sheet-grabber" aria-hidden="true" />
          <ul class="sheet-list">
            <li v-for="row in rows" :key="row">{{ row }}</li>
          </ul>
        </div>
      </PullToRefresh>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { Loader, PullToRefresh, useSpringValue } from 'vael-ui'

const ptr = useTemplateRef('ptr')
const rows = shallowRef(['Inbox', 'Design review', 'Standup notes', 'Invoices', 'Reading list'])

async function refresh() {
  await new Promise((resolve) => setTimeout(resolve, 1400))
  rows.value = [`New at ${new Date().toLocaleTimeString()}`, ...rows.value]
}

// Held, the sheet follows your finger exactly; otherwise it springs to the pull's progress, which
// stays up while refreshing and drops to 0 once done.
// A 0–1 value: settles within a thousandth, not the default 0.05.
const lift = useSpringValue(0, { damping: 0.75, response: 0.45, epsilon: 0.001 })
watchEffect(() => {
  const held = ptr.value?.state === 'pulling' || ptr.value?.state === 'ready'
  const p = Math.min(1, ptr.value?.progress ?? 0)
  if (held) lift.jump(p)
  else lift.set(p)
})

const sheetStyle = computed(() => {
  const p = lift.value.value
  return {
    borderStartStartRadius: `${4 + p * 20}px`,
    borderStartEndRadius: `${4 + p * 20}px`,
    scale: `${1 - p * 0.03}`,
    boxShadow: `0 ${-2 - p * 10}px ${8 + p * 24}px rgb(0 0 0 / ${0.08 + p * 0.22})`,
  }
})
</script>

<style scoped>
.tray {
  block-size: 20rem;
  max-inline-size: 22rem;
  overflow: hidden;
  border-radius: var(--ui-radius-surface);
  background: oklch(0.2 0 0);
  margin-block-end: 1.5rem;
}
.tray-scroll {
  block-size: 100%;
}
.tray-indicator {
  display: grid;
  place-items: center;
  block-size: 100%;
  color: oklch(0.85 0 0);
  font-size: 0.8125rem;
}
.sheet {
  min-block-size: 100%;
  padding: 0.5rem 0 1rem;
  background: var(--ui-surface);
  transform-origin: 50% 0;
}
.sheet-grabber {
  display: block;
  inline-size: 2.25rem;
  block-size: 0.25rem;
  margin: 0.25rem auto 0.5rem;
  border-radius: 999px;
  background: var(--ui-border);
}
.sheet-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.sheet-list li {
  padding: 0.75rem 1rem;
  border-block-end: 1px solid var(--ui-border);
  font-size: 0.875rem;
}
</style>
