<template>
  <section class="demo">
    <h3>Turn off animations everywhere</h3>
    <p class="note">
      <code>:motion-css="false"</code> switches off every component's built-in transitions inside,
      handy for screenshot and end-to-end tests that shouldn't wait on motion, or for an app that
      animates everything itself. Toggle it and open the accordion or flip the switch.
    </p>
    <Switch v-model="animate" label="Built-in animations" />
    <ConfigProvider :motion-css="animate">
      <div class="stack">
        <Switch v-model="wifi" label="Wi-Fi" />
        <Accordion v-model:value="open">
          <AccordionItem value="one" title="What does this turn off?">
            Transitions like this panel opening, the switch thumb sliding and the month sliding in a
            calendar. Your own animations are untouched.
          </AccordionItem>
        </Accordion>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Accordion, AccordionItem, ConfigProvider, Switch } from 'vael-ui'

const animate = shallowRef(false)
const wifi = shallowRef(true)
const open = shallowRef<string | null>(null)
</script>

<style scoped>
.stack {
  display: grid;
  gap: 1rem;
  max-inline-size: 26rem;
  margin-block-start: 1rem;
}
</style>
