<template>
  <section class="demo">
    <h3>Currency mode</h3>
    <p class="note">Formats and clamps as USD on blur, the model stays a plain number.</p>
    <InputNumber v-model="price" mode="currency" currency="USD" :min="0" :step="0.01" />
    <p class="note">Model: {{ price ?? '(empty)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { InputNumber } from 'vael-ui'

const price = shallowRef<number | null>(19.99)
</script>
