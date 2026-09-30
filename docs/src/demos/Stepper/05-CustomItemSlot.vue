<template>
  <section class="demo">
    <h3><code>#item</code> slot, custom label content</h3>
    <Stepper v-model="freeStep" :items="checkoutSteps" class="stepper-demo">
      <template #item="{ item, completed, active, disabled }">
        <span class="custom-label">{{ item.label }}</span>
        <span class="custom-status" :data-state="completed ? 'completed' : active ? 'active' : ''">
          <PhCheck v-if="completed" weight="bold" />
          {{ completed ? 'Done' : active ? 'In progress' : disabled ? 'Locked' : 'Up next' }}
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
.custom-label {
  font-size: 0.875rem;
  font-weight: 500;
}
.custom-status {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
.custom-status[data-state='active'],
.custom-status[data-state='completed'] {
  color: var(--ui-primary);
}
</style>
