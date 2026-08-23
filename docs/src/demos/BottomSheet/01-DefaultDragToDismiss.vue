<template>
  <section class="demo">
    <h3>Default, <code>title</code> prop, drag-to-dismiss</h3>
    <Button @click="basicOpen = true">Choose a plan</Button>
    <BottomSheet v-model:open="basicOpen" title="Choose a plan" aria-label="Choose a plan">
      <div class="sheet-plan-list">
        <Button
          v-for="plan in plans"
          :key="plan.id"
          variant="outline"
          class="sheet-plan"
          @click="chosenPlan = plan.id"
        >
          <span>{{ plan.name }}</span>
          <span class="sheet-plan-price">{{ plan.price }}</span>
        </Button>
      </div>
      <p v-if="chosenPlanName" class="sheet-lede">Selected: {{ chosenPlanName }}</p>
      <p class="sheet-lede">Drag this row of extra text down to try the dismiss gesture:</p>
      <p v-for="i in 12" :key="i" class="sheet-filler">
        Scrollable filler line {{ i }}. Scroll to the top, then drag down to dismiss instead of
        scroll.
      </p>
    </BottomSheet>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, BottomSheet } from 'vael-ui'

const basicOpen = shallowRef(false)
const plans = [
  { id: 'individual', name: 'Individual', price: '$9.99/mo' },
  { id: 'family', name: 'Family', price: '$16.99/mo' },
  { id: 'business', name: 'Business', price: '$29.99/mo' },
]
const chosenPlan = shallowRef<string | null>(null)
const chosenPlanName = computed(() => plans.find((p) => p.id === chosenPlan.value)?.name)
</script>

<style scoped>
.sheet-plan-list {
  display: grid;
  gap: 0.5rem;
  margin-block-end: 1rem;
}
.sheet-plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  inline-size: 100%;
}
.sheet-plan-price {
  color: var(--ui-text-muted);
}
.sheet-lede {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
.sheet-filler {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
