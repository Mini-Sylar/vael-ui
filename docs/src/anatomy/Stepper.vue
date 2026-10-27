<!-- Stepper with every part: a completed, the current and an upcoming step, joined by connectors. -->
<template>
  <div data-specimen class="specimen">
    <Stepper v-model="step" :items="steps" orientation="vertical" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Stepper } from 'vael-ui'
import type { StepperItem } from 'vael-ui'

const steps: StepperItem[] = [
  { label: 'Account', description: 'Ada Lovelace' },
  { label: 'Plan', description: 'Team plan' },
  { label: 'Payment', description: 'Card or invoice' },
]
const step = shallowRef(1)
</script>

<style scoped>
.specimen {
  inline-size: min(18rem, 100%);
}
</style>
