<template>
  <section class="demo">
    <h3>Sizes, with <code>min</code>, <code>max</code> and <code>step</code></h3>
    <p class="note">
      Values clamp on blur: try typing 999. The arrow keys and the stepper buttons change the value
      by <code>step</code>, and holding a button repeats.
    </p>
    <div class="row">
      <InputNumber v-model="sizeSm" size="sm" :min="0" :max="10" placeholder="Small" />
      <InputNumber v-model="sizeMd" size="md" :min="0" :max="10" placeholder="Medium" />
      <InputNumber v-model="sizeLg" size="lg" :min="0" :max="10" placeholder="Large" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { InputNumber } from 'vael-ui'

const sizeSm = shallowRef<number | null>(3)
const sizeMd = shallowRef<number | null>(3)
const sizeLg = shallowRef<number | null>(3)
</script>
