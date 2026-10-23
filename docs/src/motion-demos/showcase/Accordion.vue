<!-- An accordion whose height, chevron, gaps and corners all ride one spring. -->
<template>
  <section class="demo">
    <h3>Bouncy accordion</h3>
    <Accordion
      v-model:value="open"
      multiple
      class="stack"
      :motion="{ spring: { damping: 0.75, response: 0.3 } }"
    >
      <AccordionItem
        v-for="(item, i) in items"
        :key="item.value"
        :value="item.value"
        :title="item.title"
        :class="['row', shape(i)]"
      >
        {{ item.text }}
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Accordion, AccordionItem } from 'vael-ui'

const items = [
  { value: 'design', title: 'Product design', text: 'From wireframes to a shipped interface.' },
  { value: 'build', title: 'Development', text: 'Vue 3 and TypeScript, built to last.' },
  { value: 'growth', title: 'Growth', text: 'Experiments, funnels and retention.' },
  { value: 'ops', title: 'Operations', text: 'Billing, support and the quiet essentials.' },
]
const open = shallowRef<string[]>(['design'])
const isOpen = (i: number) => !!items[i] && open.value.includes(items[i].value)
// An open row stands apart: a gap above it and the next, its own rounded corners.
const shape = (i: number) => ({
  gap: i > 0 && (isOpen(i) || isOpen(i - 1)),
  top: i === 0 || isOpen(i) || isOpen(i - 1),
  bottom: i === items.length - 1 || isOpen(i) || isOpen(i + 1),
})
</script>

<style scoped>
.demo {
  display: grid;
  place-items: start center;
  padding-block: 1rem;
}
.stack {
  inline-size: min(22rem, 100%);
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.06)) drop-shadow(0 12px 24px rgb(0 0 0 / 0.08));
}
.demo :deep(.row) {
  overflow: hidden;
  border: 0;
  background: var(--ui-surface);
  /* The gap and the corners ride the accordion's own spring. */
  transition-property: margin-block-start, border-radius;
  transition-duration: var(--ui-accordion-duration);
  transition-timing-function: var(--ui-accordion-ease);
}
.demo :deep(.row .ui-accordion-trigger),
.demo :deep(.row .ui-accordion-body) {
  padding-inline: 1.25rem;
}
.demo :deep(.row.gap) {
  margin-block-start: 12px;
}
.demo :deep(.row.top) {
  border-start-start-radius: 24px;
  border-start-end-radius: 24px;
}
.demo :deep(.row.bottom) {
  border-end-start-radius: 24px;
  border-end-end-radius: 24px;
}
</style>
