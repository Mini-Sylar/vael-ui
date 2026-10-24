<template>
  <section class="demo">
    <h3>Extreme: panels open and their rows stagger in</h3>
    <p class="note">
      Accordion's own <code>motion</code> sets one duration and curve for the panel height and the
      chevron turn. Each row is <code>v-animate</code> with its own <code>delay</code> and a
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
            v-for="(row, i) in section.rows"
            :key="row"
            v-animate:rows="{ ...rowLook, delay: 0.05 + i * 0.04, replay: opens[section.value] }"
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

// Height and chevron turn share one strong ease-out.
const motion: AccordionMotion = { duration: 300, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }

const rowLook = {
  initial: { opacity: 0, y: 8 },
  duration: 200,
  easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
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
