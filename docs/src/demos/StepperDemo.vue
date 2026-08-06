<template>
  <section class="demo">
    <h2>Stepper</h2>
    <p class="note">
      Shows progress through a fixed sequence you already know the length of — checkout, onboarding,
      a setup wizard. Not for open-ended navigation between unrelated pages; use
      <code>Tabs</code> or <code>Breadcrumb</code> for that instead.
    </p>
    <p class="note">
      <code>items</code> is a plain array (mirrors <code>SelectButton</code>), not slotted children
      — no parent/child registration needed. The connector between two steps fills independently of
      its neighbors, so steps don't need to be evenly spaced. On <code>horizontal</code>, a step row
      too wide for its container scrolls horizontally instead of overflowing.
    </p>

    <h3>Linear (default): back is always allowed, ahead only once reached</h3>
    <Stepper v-model="linearStep" :items="checkoutSteps" class="stepper-demo" />
    <div class="row">
      <Button variant="outline" :disabled="linearStep === 0" @click="linearStep--">Back</Button>
      <Button :disabled="linearStep === checkoutSteps.length - 1" @click="linearStep++"
        >Next</Button
      >
    </div>

    <h3>Vertical</h3>
    <Stepper
      v-model="linearStep"
      :items="checkoutSteps"
      orientation="vertical"
      class="stepper-demo"
    />

    <h3><code>linear=false</code>: jump to any non-disabled step</h3>
    <Stepper v-model="freeStep" :items="checkoutSteps" :linear="false" class="stepper-demo" />

    <h3><code>clickable=false</code>: pure progress display</h3>
    <p class="note">Driven entirely by an external process — nothing here responds to a click.</p>
    <Stepper
      :model-value="uploadStep"
      :items="uploadSteps"
      :clickable="false"
      class="stepper-demo"
    />

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
import { Button, Stepper } from 'vael-ui'
import type { StepperItem } from 'vael-ui'
import { PhCheck } from '@phosphor-icons/vue'

const checkoutSteps: StepperItem[] = [
  { label: 'Cart', description: '3 items' },
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review', disabled: true },
]

const linearStep = shallowRef(1)
const freeStep = shallowRef(0)

const uploadSteps: StepperItem[] = [
  { label: 'Uploading' },
  { label: 'Processing' },
  { label: 'Done' },
]
const uploadStep = shallowRef(1)
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
