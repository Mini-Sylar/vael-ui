<template>
  <section class="demo">
    <h3>Inside a Field, with validation</h3>
    <Field label="Seats to reserve" description="Up to 20 per booking" :error="fieldError">
      <InputNumber v-model="quantity" :min="1" :max="20" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Field, InputNumber } from 'vael-ui'

const quantity = shallowRef<number | null>(null)

const fieldError = computed(() =>
  quantity.value !== null && quantity.value > 20 ? 'Maximum 20 seats' : undefined,
)
</script>
