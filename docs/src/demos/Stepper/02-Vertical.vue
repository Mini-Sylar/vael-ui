<template>
  <section class="demo">
    <h3>Vertical</h3>
    <Stepper
      v-model="linearStep"
      :items="checkoutSteps"
      orientation="vertical"
      class="stepper-demo"
    />
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

const linearStep = shallowRef(1)
</script>

<style scoped>
.stepper-demo {
  max-inline-size: 32rem;
  margin-block-end: 1.25rem;
}
</style>
