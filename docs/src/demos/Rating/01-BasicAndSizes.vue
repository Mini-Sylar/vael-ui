<template>
  <section class="demo">
    <h3>Basic usage and sizes</h3>
    <p class="note">Click, or drag across the row, to set the value. Defaults to 5 stars.</p>
    <div class="row">
      <Rating v-model="smValue" size="sm" />
      <Rating v-model="mdValue" size="md" />
      <Rating v-model="lgValue" size="lg" />
    </div>
    <p class="note">sm: {{ smValue }}, md: {{ mdValue }}, lg: {{ lgValue }}</p>
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
