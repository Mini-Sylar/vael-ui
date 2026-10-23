<template>
  <section class="demo">
    <h3>Rename in place</h3>
    <p class="note">
      Click the name to edit it. Enter saves, Escape cancels, and leaving the field saves too
      (<code>submit-mode="both"</code>, the default).
    </p>
    <div class="editable-stack">
      <Editable v-model="name" aria-label="Project name" />
      <Editable v-model="empty" placeholder="Add a description" size="sm" />
      <Editable v-model="name" disabled />
    </div>
    <p class="demo-status">Saved: {{ name }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Editable } from 'vael-ui'

const name = shallowRef('Quarterly roadmap')
const empty = shallowRef('')
</script>

<style scoped>
.editable-stack {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}
</style>
