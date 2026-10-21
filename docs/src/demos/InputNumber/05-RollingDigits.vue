<template>
  <section class="demo">
    <h3>Rolling digits and scrubbing</h3>
    <p class="note">
      <code>animated</code> rolls each changed digit, like AnimatedNumber, when the value changes
      from the steppers, the arrow keys or your code. Hold a stepper to watch it run. Typing shows
      the plain input, and it rolls again once you press Enter or leave the field.
      <code>scrub</code> lets you drag sideways on a field you're not typing in, one step per 4 px
      and ten with Shift, like a design tool; a click still puts you in the field.
    </p>
    <div class="row">
      <Field label="Quantity">
        <InputNumber v-model="quantity" animated scrub :min="0" />
      </Field>
      <Field label="Budget">
        <InputNumber
          v-model="budget"
          animated
          mode="currency"
          currency="USD"
          :step="250"
          stepper-position="split"
        />
      </Field>
      <Button variant="secondary" @click="budget = Math.round(Math.random() * 50000)">
        Set from code
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Field, InputNumber } from 'vael-ui'

const quantity = shallowRef<number | null>(18)
const budget = shallowRef<number | null>(12500)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
</style>
