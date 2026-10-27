<template>
  <div class="v-hover-indicator-demo">
    <ul v-hover-indicator="'.row'" class="list" aria-label="Recent files">
      <li v-for="file in files" :key="file">
        <button type="button" class="row">{{ file }}</button>
      </li>
    </ul>
    <!-- Rows with a solid background: the highlight is a tint drawn over them. -->
    <ul v-hover-indicator.over="'.card'" class="list" aria-label="Pinned">
      <li v-for="file in pinned" :key="file">
        <button type="button" class="card">{{ file }}</button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { vHoverIndicator } from 'vael-ui'

const files = ['Roadmap.md', 'Pricing.xlsx', 'Launch plan.pdf', 'Notes.txt']
const pinned = ['Team handbook', 'Brand guide', 'Q3 review']
</script>

<style scoped>
.v-hover-indicator-demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}
.list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.row,
.card {
  inline-size: 100%;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: calc(var(--ui-radius) - 4px);
  background: transparent;
  color: var(--ui-text);
  font: inherit;
  font-size: 0.875rem;
  text-align: start;
  cursor: pointer;
}
.card {
  background: var(--ui-muted);
}
</style>
