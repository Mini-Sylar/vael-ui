<!-- Resizable with every part: a sidebar panel and the grip handle on its edge. -->
<template>
  <div data-specimen class="specimen">
    <Resizable v-model:size="size" :min="96" :max="200" class="sidebar" aria-label="Resize sidebar">
      <nav class="nav" aria-label="Workspace">
        <span v-for="item in nav" :key="item" class="nav-item">{{ item }}</span>
      </nav>
      <!-- A grip, so the edge reads as draggable at rest. -->
      <template #handle><span class="grip" /></template>
    </Resizable>
    <div class="main">
      <strong>Team plan</strong>
      <p>8 of 10 seats in use. Renews on March 1.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Resizable } from 'vael-ui'

const nav = ['Overview', 'Members', 'Billing', 'Settings']
const size = shallowRef(128)
</script>

<style scoped>
.specimen {
  display: flex;
  inline-size: min(24rem, 100%);
  block-size: 11rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
}
.sidebar {
  flex-shrink: 0;
  border-inline-end: 1px solid var(--ui-border);
  background: var(--ui-surface);
  border-start-start-radius: inherit;
  border-end-start-radius: inherit;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.625rem;
}
.nav-item {
  padding: 0.375rem 0.5rem;
  border-radius: var(--ui-radius);
  font-size: 0.8125rem;
}
.nav-item:first-child {
  background: var(--ui-muted);
}
.grip {
  position: absolute;
  inset: 0;
  margin: auto;
  inline-size: 4px;
  block-size: 1.75rem;
  border-radius: 2px;
  background: var(--ui-border-strong);
}
.main {
  flex: 1;
  min-inline-size: 0;
  padding: 0.875rem 1rem;
  font-size: 0.875rem;
}
.main p {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
