<template>
  <section class="demo">
    <h3><code>#item</code> slot, fully custom circle content</h3>
    <Stepper v-model="freeStep" :items="checkoutSteps" class="stepper-demo">
      <template #item="{ index, completed, active }">
        <span class="custom-circle" :data-state="completed ? 'completed' : active ? 'active' : ''">
          <PhCheck v-if="completed" weight="bold" />
          <template v-else>{{ index + 1 }}</template>
        </span>
      </template>
    </Stepper>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Stepper } from 'vael-ui'
import type { StepperItem } from 'vael-ui'
import { PhCheck } from '@phosphor-icons/vue'

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
.custom-circle {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: calc(var(--ui-radius) - 4px);
  border: 1.5px solid var(--ui-border-strong);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}
.custom-circle[data-state='active'] {
  border-color: var(--ui-primary);
  color: var(--ui-primary);
}
.custom-circle[data-state='completed'] {
  border-color: var(--ui-primary);
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
}
</style>
