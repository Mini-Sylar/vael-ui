<template>
  <section class="demo">
    <h3><code>clickable=false</code>: progress display only</h3>
    <p class="note">An outside process drives the steps; nothing here responds to a click.</p>
    <Stepper
      :model-value="uploadStep"
      :items="uploadSteps"
      :clickable="false"
      class="stepper-demo"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Stepper } from 'vael-ui'
import type { StepperItem } from 'vael-ui'

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
</style>
