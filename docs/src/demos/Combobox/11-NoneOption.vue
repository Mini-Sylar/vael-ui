<template>
  <section class="demo">
    <h3>A "none" choice</h3>
    <p class="note">
      An item whose <code>value</code> is <code>null</code> is a choice of its own. Picking
      “Unassigned” sets the model to <code>null</code>, and a <code>null</code> model shows it as
      picked.
    </p>
    <Combobox
      v-model="assignee"
      :items="people"
      aria-label="Assignee"
      placeholder="Search people…"
      style="inline-size: 16rem"
    />
    <p class="status">Model: {{ JSON.stringify(assignee) }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Combobox } from 'vael-ui'

const assignee = shallowRef<string | null>(null)
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
