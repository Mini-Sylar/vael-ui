<template>
  <section class="demo">
    <h3>Inside an existing scroll area</h3>
    <p class="note">
      Pass <code>:scroll-el</code> when the scrolling already happens on an ancestor. The component
      stays a thin wrapper and never takes over that element's <code>overflow</code>. The gesture
      engages only while that element is scrolled to the very top — scroll down and it's an ordinary
      list again.
    </p>
    <div ref="scroller" class="ptr-scroller">
      <PullToRefresh :on-refresh="refresh" :scroll-el="scroller">
        <ul class="ptr-list">
          <li v-for="rowLabel in rows" :key="rowLabel" class="ptr-row">{{ rowLabel }}</li>
        </ul>
      </PullToRefresh>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { PullToRefresh } from 'vael-ui'

const scroller = useTemplateRef<HTMLElement>('scroller')
const rows = shallowRef(Array.from({ length: 24 }, (_, i) => `Row ${i + 1}`))

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function refresh() {
  await wait(1200)
  rows.value = [`Refreshed @ ${new Date().toLocaleTimeString()}`, ...rows.value]
}
</script>

<style scoped>
.ptr-scroller {
  block-size: 320px;
  overflow-y: auto;
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
</style>
