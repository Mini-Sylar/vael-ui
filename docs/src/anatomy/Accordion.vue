<!-- Accordion with every part: three items, each a header and trigger, the first open on its panel and body. -->
<template>
  <div data-specimen class="specimen">
    <Accordion v-model:value="open">
      <AccordionItem value="seats" title="How do seats work?">
        Each seat is one person. Add or remove seats any time, and we prorate the change.
      </AccordionItem>
      <AccordionItem value="billing" title="Can I change the billing email?">
        Yes, from Settings, under Billing.
      </AccordionItem>
      <AccordionItem value="cancel" title="What happens if I cancel?">
        Your projects stay readable until the end of the billing period.
      </AccordionItem>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Accordion, AccordionItem } from 'vael-ui'

const open = shallowRef<string | null>('seats')
</script>

<style scoped>
.specimen {
  inline-size: min(24rem, 100%);
}
</style>
