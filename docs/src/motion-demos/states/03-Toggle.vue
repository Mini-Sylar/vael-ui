<template>
  <section class="demo">
    <h3>Toggles</h3>
    <div class="layout">
      <Accordion v-model:value="value" :motion="chevron">
        <AccordionItem value="plan" title="Plan">Pro, billed monthly.</AccordionItem>
        <AccordionItem value="team" title="Team">Four seats in use.</AccordionItem>
      </Accordion>
      <label class="switch">
        <Switch v-model="notify" :motion="squash" />
        Email notifications
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Accordion, AccordionItem, Switch } from 'vael-ui'
import type { AccordionMotion, SwitchMotion } from 'vael-ui'

const value = shallowRef<string | null>(null)
const notify = shallowRef(true)

// Held while open, on a bouncy spring.
const chevron: AccordionMotion = {
  states: { open: { chevron: { rotate: 180 } } },
  spring: 'bouncy',
}
// Wider and flatter while pressed.
const squash: SwitchMotion = {
  states: { active: { thumb: { scale: '1.25 0.85' } } },
}
</script>

<style scoped>
.layout {
  display: grid;
  gap: 1.5rem;
  max-width: 24rem;
}
.switch {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}
</style>
