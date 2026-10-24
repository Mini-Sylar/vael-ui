<template>
  <section class="demo">
    <h3>Currency mode</h3>
    <p class="note">
      <code>mode="currency"</code> formats and clamps the value as USD on blur, and the model stays
      a plain number.
    </p>
    <Field label="Price">
      <InputNumber v-model="price" mode="currency" currency="USD" :min="0" :step="0.01" />
    </Field>
    <p class="demo-status">Model: {{ price ?? '(empty)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, InputNumber } from 'vael-ui'

const price = shallowRef<number | null>(19.99)
</script>
