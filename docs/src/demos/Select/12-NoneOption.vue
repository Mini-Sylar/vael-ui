<template>
  <section class="demo">
    <h3>A "none" choice</h3>
    <p>
      An item whose <code>value</code> is <code>null</code> is a choice of its own: picking
      “Unassigned” sets the model to <code>null</code>, and a <code>null</code> model shows it as
      picked. No sentinel strings.
    </p>
    <Select v-model="assignee" :items="people" aria-label="Assignee" style="inline-size: 14rem" />
    <p class="status">Model: {{ JSON.stringify(assignee) }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Select } from 'vael-ui'

const assignee = ref<string | null>('ana')
const people = [
  { value: null, label: 'Unassigned' },
  { value: 'ana', label: 'Ana Mensah' },
  { value: 'kofi', label: 'Kofi Boateng' },
]
</script>

<style scoped>
.status {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
