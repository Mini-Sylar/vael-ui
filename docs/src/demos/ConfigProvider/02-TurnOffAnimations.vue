<template>
  <section class="demo">
    <h3>Turn off animations everywhere</h3>
    <p class="note">
      <code>:motion="false"</code> turns off every built-in transition inside. Everything still
      opens, closes and leaves, but instantly. Use it for screenshot and end-to-end tests that
      shouldn't wait on motion. Toggle it, then open the accordion or flip the switch.
    </p>
    <Switch v-model="animate" label="Built-in animations" />
    <ConfigProvider :motion="animate">
      <div class="stack">
        <Switch v-model="wifi" label="Wi-Fi" />
        <Accordion v-model:value="open">
          <AccordionItem value="one" title="What does this turn off?">
            It turns off transitions like this panel opening, the switch thumb sliding and a
            calendar's month sliding in. Your own animations keep running.
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
