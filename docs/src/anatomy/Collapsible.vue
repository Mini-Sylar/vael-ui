<!-- Collapsible with every part: its trigger, and the panel and body it opens. -->
<template>
  <div data-specimen class="specimen">
    <Collapsible v-model:open="open" class="group" :ui="{ trigger: { style: 'width:100%' } }">
      <template #trigger="{ open: isOpen }">
        <Button variant="ghost" block style="justify-content: space-between">
          Billing
          <template #trailing>
            <PhCaretDown :size="12" :style="{ rotate: isOpen ? '180deg' : '0deg' }" />
          </template>
        </Button>
      </template>
      <ul class="links">
        <li>Invoices</li>
        <li>Payment method</li>
        <li>Billing email</li>
      </ul>
    </Collapsible>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Collapsible } from 'vael-ui'
import { PhCaretDown } from '@phosphor-icons/vue'

const open = shallowRef(true)
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
.group {
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.links {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0.25rem 0.75rem 0.75rem;
  list-style: none;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
