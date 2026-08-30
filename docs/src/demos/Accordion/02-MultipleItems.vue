<template>
  <section class="demo">
    <h3><code>multiple</code>, several items open at once</h3>
    <Accordion v-model:value="multipleValue" multiple class="accordion-demo">
      <AccordionItem value="a" title="Section A">Content for section A.</AccordionItem>
      <AccordionItem value="b" title="Section B">Content for section B.</AccordionItem>
      <AccordionItem value="c" title="Section C">Content for section C.</AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Accordion, AccordionItem } from 'vael-ui'

const multipleValue = shallowRef<string[]>(['a'])
</script>

<style scoped>
.accordion-demo {
  max-width: 32rem;
  margin-block-end: 1.5rem;
}
</style>
