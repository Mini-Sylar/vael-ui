<template>
  <section class="demo">
    <h3>Custom <code>#trigger</code>, the chevron is opt-in, not automatic</h3>
    <Accordion v-model:value="customValue" class="accordion-demo">
      <AccordionItem value="custom" title="This title is ignored, #trigger replaces it entirely">
        <template #trigger="{ open }">
          <span class="custom-trigger-title">
            {{ open ? '▾' : '▸' }} Custom trigger row, no chevron included by default
          </span>
        </template>
        The default slot content is unaffected by a custom trigger.
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Accordion, AccordionItem } from 'vael-ui'

const customValue = shallowRef<string | null>(null)
</script>

<style scoped>
.accordion-demo {
  max-width: 32rem;
  margin-block-end: 1.5rem;
}
.custom-trigger-title {
  font-weight: 500;
}
</style>
