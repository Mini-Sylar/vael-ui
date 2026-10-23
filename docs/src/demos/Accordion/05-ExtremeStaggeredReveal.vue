<template>
  <section class="demo">
    <h3>Extreme: panels open and their rows stagger in</h3>
    <p class="note">
      Accordion's own <code>motion</code> grows the panel on a spring and pops the chevron through
      <code>states.open</code>. Each row is <code>v-animate</code> with <code>stagger</code> and a
      <code>replay</code> count that only rises on open, so rows fade up one after another when
      their panel opens and stay put when it closes.
    </p>
    <Accordion v-model:value="openItem" :motion="motion" class="reveal-accordion">
      <AccordionItem
        v-for="section in sections"
        :key="section.value"
        :value="section.value"
        :title="section.title"
      >
        <ul class="reveal-rows">
          <li
            v-for="row in section.rows"
            :key="row"
            v-animate:rows="{ ...rowLook, replay: opens[section.value] }"
          >
            {{ row }}
          </li>
        </ul>
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef, watch } from 'vue'
import { Accordion, AccordionItem, vAnimate } from 'vael-ui'
import type { AccordionMotion } from 'vael-ui'

const sections = [
  {
    value: 'shipping',
    title: 'Shipping',
    rows: ['Free over $50', 'Ships in 1 to 2 days', 'Tracking sent by email'],
  },
  {
    value: 'returns',
    title: 'Returns',
    rows: ['30 days, no questions', 'Prepaid label in the box', 'Refunds land in 3 days'],
  },
  {
    value: 'warranty',
    title: 'Warranty',
    rows: ['Two years on parts', 'Repairs or a replacement', 'Covers drops in year one'],
  },
]
const openItem = shallowRef<string | null>('shipping')

// Counts opens per item; a close leaves it alone, so rows only replay on the way in.
const opens = reactive<Record<string, number>>({ shipping: 1, returns: 0, warranty: 0 })
watch(openItem, (next) => {
  if (next) opens[next] = (opens[next] ?? 0) + 1
})

const motion: AccordionMotion = {
  spring: { damping: 1, response: 0.35 },
  states: { open: { chevron: { scale: [1, 1.3, 1] } } },
}

const rowLook = {
  initial: { opacity: 0, y: 8 },
  stagger: 0.05,
  delay: 0.08,
  duration: 220,
  easing: 'var(--ui-ease-out)',
}
</script>

<style scoped>
.reveal-accordion {
  max-width: 32rem;
  margin-block-end: 1.5rem;
}
.reveal-rows {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
