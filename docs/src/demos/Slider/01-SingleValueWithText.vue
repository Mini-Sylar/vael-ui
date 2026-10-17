<template>
  <section class="demo">
    <h3>Single value, with <code>valueText</code></h3>
    <div class="row slider-row">
      <Field label="Price" class="slider-field">
        <Slider v-model="price" :min="0" :max="200" :step="5" :value-text="(v) => `$${v}`" />
      </Field>
      <output class="demo-status">${{ price }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Slider } from 'vael-ui'

const price = shallowRef(75)
</script>

<style scoped>
.slider-row {
  align-items: flex-end;
  gap: 1rem;
}

.slider-field {
  inline-size: 100%;
  max-inline-size: 20rem;
}
</style>
