<template>
  <section class="demo">
    <h3>Order tracking, with derived <code>completed</code>/<code>active</code></h3>
    <p class="note">
      <code>completed</code> and <code>active</code> are two independent functions you supply — here
      they both read a plain <code>done</code> boolean on each step. Nothing about the item shape is
      dictated by Timeline itself.
    </p>
    <Timeline :items="steps" :completed="(step) => step.done" :active="isActive">
      <template #item="{ item, completed }">
        <p class="step-title">{{ item.label }}</p>
        <Tag size="sm" :variant="completed ? 'success' : 'muted'">{{ item.date }}</Tag>
      </template>
    </Timeline>
  </section>
</template>

<script setup lang="ts">
import { Tag, Timeline } from 'vael-ui'

interface OrderStep {
  label: string
  date: string
  done: boolean
}

const steps: OrderStep[] = [
  { label: 'Order placed', date: 'Mon', done: true },
  { label: 'Packed', date: 'Tue', done: true },
  { label: 'Out for delivery', date: 'Wed', done: false },
  { label: 'Delivered', date: 'Thu', done: false },
]

// The first not-yet-done step reads as "in progress" — Timeline has no notion of this itself,
// and it's independent of `completed`, not a third value sharing one slot with it.
function isActive(_step: OrderStep, index: number): boolean {
  const firstPending = steps.findIndex((s) => !s.done)
  return index === firstPending
}
</script>

<style scoped>
.step-title {
  margin: 0 0 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  /* Matches the marker's own block-size so the ring lines up with this text
     instead of its own leading — same trick Timeline's #opposite uses. */
  line-height: 1.25rem;
}
</style>
