<template>
  <section class="demo">
    <h3>Linear (default): back is always allowed, ahead only once reached</h3>
    <Stepper v-model="linearStep" :items="checkoutSteps" class="stepper-demo" />
    <div class="row">
      <Button variant="outline" :disabled="linearStep === 0" @click="linearStep--">Back</Button>
      <Button :disabled="linearStep === checkoutSteps.length - 1" @click="linearStep++"
        >Next</Button
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Stepper } from 'vael-ui'
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
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
