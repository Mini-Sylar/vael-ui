<template>
  <section class="demo">
    <h3>v-draggable: a plain list with a handle</h3>
    <p>A <code>handle</code> selector limits where a drag can start.</p>
    <ul v-draggable="filesDraggable" class="draggable-files">
      <li v-for="file in files" :key="file.id" class="draggable-file">
        <span data-grip class="draggable-file-grip">⠿</span>
        <span>{{ file.label }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { vDraggable } from 'vael-ui'

const files = reactive([
  { id: 'f1', label: 'design.fig' },
  { id: 'f2', label: 'notes.md' },
  { id: 'f3', label: 'budget.xlsx' },
])
const filesDraggable = computed(() => ({ items: files, handle: '[data-grip]' }))
</script>

<style scoped>
.draggable-files {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
  max-inline-size: 20rem;
}
.draggable-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  font-size: 0.875rem;
}
.draggable-file[data-dragging] {
  opacity: 0;
}
.draggable-file-grip {
  /* The glyph itself is a few px wide — this is the actual touch target,
     roughly WCAG's 44px minimum, without visually enlarging the row. */
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  margin: -0.5rem -0.625rem -0.5rem -0.375rem;
  color: var(--ui-text-muted);
  font-size: 1rem;
  cursor: grab;
  touch-action: none;
}
</style>
