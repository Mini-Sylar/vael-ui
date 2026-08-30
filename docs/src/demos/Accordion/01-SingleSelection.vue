<template>
  <section class="demo">
    <h3>Single selection (FAQ)</h3>
    <p class="note">
      Opening one item closes the previous one. Set <code>:collapsible="false"</code> if you want
      the currently open item to stay open when its own trigger is clicked, useful for a settings
      panel where some section should never fully collapse.
    </p>
    <Accordion v-model:value="singleValue" class="accordion-demo">
      <AccordionItem value="shipping" title="What are the shipping options?">
        Standard shipping takes 3-5 business days. Express arrives in 1-2 business days at checkout
        for an extra fee.
      </AccordionItem>
      <AccordionItem value="returns" title="What's the return policy?">
        Items can be returned within 30 days of delivery for a full refund, provided they're unused
        and in original packaging.
      </AccordionItem>
      <AccordionItem value="support" title="How do I contact support?" disabled>
        Disabled, this item can't be opened.
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Accordion, AccordionItem } from 'vael-ui'

const singleValue = shallowRef<string | null>('shipping')
</script>

<style scoped>
.accordion-demo {
  max-width: 32rem;
  margin-block-end: 1.5rem;
}
</style>
