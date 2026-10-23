<template>
  <section class="demo">
    <h3>One at a time</h3>
    <Stepper v-model="step" :items="items" :motion="motion" />
    <div class="actions">
      <Button variant="secondary" size="sm" :disabled="step === 0" @click="step--">Back</Button>
      <Button size="sm" :disabled="step === items.length - 1" @click="step++">Next</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Stepper } from 'vael-ui'
import type { StepperMotion } from 'vael-ui'

const items = [{ label: 'Cart' }, { label: 'Shipping' }, { label: 'Payment' }, { label: 'Done' }]
const step = shallowRef(0)
// Only the step that becomes current pops, once its line has filled.
const motion: StepperMotion = {
  states: {
    current: {
      circle: { scale: { value: [1, 1.2, 1], duration: 450, easing: 'ease-out', delay: 0.15 } },
    },
  },
}
</script>

<style scoped>
.actions {
  display: flex;
  gap: 0.5rem;
  margin-block-start: 1rem;
}
</style>
