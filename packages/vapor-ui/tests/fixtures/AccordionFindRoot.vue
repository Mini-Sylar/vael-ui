<template>
  <Accordion v-model:value="value">
    <AccordionItem value="a" title="Billing">Invoices go out monthly</AccordionItem>
    <AccordionItem value="b" title="Safety">Wear gloves near the panel</AccordionItem>
  </Accordion>
  <output data-testid="value">{{ value }}</output>
</template>

<script setup lang="ts" vapor>
import { shallowRef } from 'vue'
import { Accordion, AccordionItem } from 'vael-ui/vapor'

const value = shallowRef<string | null>(null)
</script>
