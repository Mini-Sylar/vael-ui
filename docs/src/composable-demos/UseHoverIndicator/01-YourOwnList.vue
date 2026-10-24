<template>
  <section class="demo">
    <h3>Your own list</h3>
    <p class="note">
      Give the list <code>position: relative; isolation: isolate</code>, put one element with the
      <code>ui-indicator</code> class inside it, and bind the style the composable returns. Hover
      the rows, or Tab into them: the highlight slides to whichever row is under the pointer or has
      keyboard focus.
    </p>
    <div ref="list" class="hover-list">
      <div class="ui-indicator" :style="style" aria-hidden="true" />
      <button v-for="file in files" :key="file" type="button" class="hover-row">
        {{ file }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useHoverIndicator } from 'vael-ui'

const files = ['Quarterly report.pdf', 'Brand guidelines.fig', 'Roadmap.md', 'Invoices.xlsx']

const list = useTemplateRef<HTMLElement>('list')
const { style } = useHoverIndicator(list, { itemSelector: '.hover-row' })
</script>

<style scoped>
.hover-list {
  position: relative;
  isolation: isolate;
  display: grid;
  gap: 0.125rem;
  max-inline-size: 18rem;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.hover-row {
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  color: var(--ui-text);
  font: inherit;
  font-size: 0.875rem;
  text-align: start;
  cursor: pointer;
}
.hover-row:focus-visible {
  outline: none;
}
</style>
