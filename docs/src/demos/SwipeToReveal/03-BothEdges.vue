<template>
  <section class="demo">
    <h3>Both edges on one row: <code>#leading-actions</code> + <code>#trailing-actions</code></h3>
    <p class="note">
      One instance, two panels — the drag's own direction decides which one opens. Provide just one
      slot to make it a single-edge row; omit both and the row is inert.
    </p>
    <ul class="swipe-list">
      <li v-for="row in rows" :key="row.id" class="swipe-row">
        <SwipeToReveal
          v-model:open="openState[row.id]"
          @change="
            (open, side) => (lastChange = open ? `${row.from} · ${side}` : `${row.from} · closed`)
          "
        >
          <template #leading-actions="{ close }">
            <div class="swipe-actions">
              <Button variant="primary" size="sm" @click="close">Pin</Button>
            </div>
          </template>
          <template #trailing-actions="{ close }">
            <div class="swipe-actions">
              <Button variant="secondary" size="sm" @click="close">Archive</Button>
              <Button variant="danger" size="sm" @click="close">Delete</Button>
            </div>
          </template>

          <div class="swipe-content">
            <Avatar :name="row.from" size="sm" />
            <div class="swipe-body">
              <strong>{{ row.from }}</strong>
              <p class="note swipe-preview">{{ row.preview }}</p>
            </div>
          </div>
        </SwipeToReveal>
      </li>
    </ul>
    <p class="note">
      Last change: <strong>{{ lastChange ?? 'none yet' }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { Avatar, Button, SwipeToReveal } from 'vael-ui'

const rows = [
  { id: 'a', from: 'Priya Nair', preview: 'Drag left for Archive / Delete, right to Pin.' },
  { id: 'b', from: 'Marcus Lee', preview: 'Same row, either edge — your swipe direction picks.' },
]
const openState = reactive<Record<string, boolean>>({})
const lastChange = shallowRef<string | null>(null)
</script>

<style scoped>
.swipe-list {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  max-inline-size: 28rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
}
.swipe-row + .swipe-row {
  border-block-start: 1px solid var(--ui-border);
}
.swipe-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--ui-surface);
}
.swipe-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-inline-size: 0;
  flex: 1;
}
.swipe-preview {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.swipe-actions {
  display: flex;
  align-items: stretch;
  gap: 1px;
  block-size: 100%;
  background: var(--ui-border);
}
.swipe-actions :deep(.ui-button) {
  border-radius: 0;
  inline-size: 5.5rem;
}
</style>
