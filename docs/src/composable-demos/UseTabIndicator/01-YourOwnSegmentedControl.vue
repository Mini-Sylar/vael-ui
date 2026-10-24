<template>
  <section class="demo">
    <h3>Your own segmented control</h3>
    <p class="note">
      Give the list <code>position: relative; isolation: isolate</code>, put one indicator element
      inside it, and bind the style the composable returns. <code>selector</code> names the active
      element, and the indicator glides to it whenever <code>view</code> changes. The shared
      <code>ui-indicator ui-indicator--inline</code> classes give it the same transition the
      built-in components use.
    </p>
    <div ref="list" class="segmented" role="radiogroup" aria-label="View">
      <div class="ui-indicator ui-indicator--inline segmented-indicator" :style="style" />
      <button
        v-for="option in options"
        :key="option"
        type="button"
        role="radio"
        class="segmented-option"
        :aria-checked="view === option"
        :data-active="view === option || undefined"
        @click="view = option"
      >
        {{ option }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useTabIndicator } from 'vael-ui'

const options = ['Day', 'Week', 'Month', 'Year']
const view = shallowRef('Week')

const list = useTemplateRef<HTMLElement>('list')
const { style } = useTabIndicator(view, { listEl: list, selector: '[data-active]' })
</script>

<style scoped>
.segmented {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  padding: 0.25rem;
  border-radius: var(--ui-radius);
  background: var(--ui-muted);
}
/* The composable sets the inline axis; the block axis comes from here. */
.segmented-indicator {
  inset-block: 0.25rem;
  background: var(--ui-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
}
.segmented-option {
  padding: 0.375rem 0.875rem;
  border: none;
  background: none;
  color: var(--ui-text-muted);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}
.segmented-option[aria-checked='true'] {
  color: var(--ui-text);
}
</style>
