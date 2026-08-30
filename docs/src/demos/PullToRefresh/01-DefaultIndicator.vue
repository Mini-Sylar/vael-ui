<template>
  <section class="demo">
    <h3>Default indicator</h3>
    <PullToRefresh class="ptr-box" :on-refresh="refreshBasic">
      <ul class="ptr-list">
        <li v-for="row in basicRows" :key="row" class="ptr-row">{{ row }}</li>
      </ul>
    </PullToRefresh>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PullToRefresh } from 'vael-ui'

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

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function refreshBasic() {
  await wait(1200)
  basicRows.value = [`New row @ ${new Date().toLocaleTimeString()}`, ...basicRows.value]
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
</style>
