<template>
  <section class="demo">
    <h3>Single value, with <code>valueText</code></h3>
    <div class="row slider-row">
      <Slider
        v-model="price"
        :min="0"
        :max="200"
        :step="5"
        :value-text="(v) => `$${v}`"
        style="max-width: 20rem"
      />
      <output class="note">${{ price }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Slider } from 'vael-ui'

const price = shallowRef(75)
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
