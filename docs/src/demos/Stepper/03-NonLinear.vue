<template>
  <section class="demo">
    <h3><code>linear=false</code>: jump to any non-disabled step</h3>
    <Stepper v-model="freeStep" :items="checkoutSteps" :linear="false" class="stepper-demo" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Stepper } from 'vael-ui'
import type { StepperItem } from 'vael-ui'

const checkoutSteps: StepperItem[] = [
  { label: 'Cart', description: '3 items' },
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review', disabled: true },
]

const freeStep = shallowRef(0)
</script>

<style scoped>
.stepper-demo {
  max-inline-size: 32rem;
  margin-block-end: 1.25rem;
}
</style>
