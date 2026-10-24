<!-- An accordion whose height, chevron, gaps and corners all ride one spring. -->
<template>
  <section class="demo">
    <h3>Bouncy accordion</h3>
    <Accordion
      v-model:value="open"
      multiple
      class="stack"
      :motion="{ spring: { damping: 0.5, response: 0.42 } }"
    >
      <AccordionItem
        v-for="(item, i) in items"
        :key="item.value"
        :value="item.value"
        :title="item.title"
        :class="['fold', shape(i)]"
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
  {
    value: 'design',
    title: 'Product design',
    text: 'From the first wireframe to a shipped, tested interface your team can grow.',
  },
  {
    value: 'build',
    title: 'Development',
    text: 'Vue 3 and TypeScript, with tests and docs, built to outlast the first launch.',
  },
  {
    value: 'growth',
    title: 'Growth',
    text: 'Experiments, funnels and retention, measured every week and kept honest.',
  },
  {
    value: 'ops',
    title: 'Operations',
    text: 'Billing, support and the quiet essentials that keep a product running.',
  },
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
.demo :deep(.fold) {
  overflow: hidden;
  border: 0;
  background: var(--ui-surface);
  /* The gap and the corners ride the accordion's own spring. */
  transition-property: margin-block-start, border-radius;
  transition-duration: var(--ui-accordion-duration);
  transition-timing-function: var(--ui-accordion-ease);
}
.demo :deep(.fold .ui-accordion-trigger),
.demo :deep(.fold .ui-accordion-body) {
  padding-inline: 1.25rem;
}
.demo :deep(.fold.gap) {
  margin-block-start: 12px;
}
.demo :deep(.fold.top) {
  border-start-start-radius: 24px;
  border-start-end-radius: 24px;
}
.demo :deep(.fold.bottom) {
  border-end-start-radius: 24px;
  border-end-end-radius: 24px;
}
</style>
