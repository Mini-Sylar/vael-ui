<template>
  <section class="demo">
    <h3>Basic usage and sizes</h3>
    <p class="note">Click, or drag across the row, to set the value. The default is 5 stars.</p>
    <div class="row">
      <Rating v-model="smValue" size="sm" aria-label="Small rating" />
      <Rating v-model="mdValue" size="md" aria-label="Medium rating" />
      <Rating v-model="lgValue" size="lg" aria-label="Large rating" />
    </div>
    <p class="demo-status">sm: {{ smValue }}, md: {{ mdValue }}, lg: {{ lgValue }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Rating } from 'vael-ui'

const smValue = shallowRef(2)
const mdValue = shallowRef(3)
const lgValue = shallowRef(4)
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
</style>
