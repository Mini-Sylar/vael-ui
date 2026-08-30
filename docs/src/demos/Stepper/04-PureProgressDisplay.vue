<template>
  <section class="demo">
    <h3><code>clickable=false</code>: pure progress display</h3>
    <p class="note">Driven entirely by an external process — nothing here responds to a click.</p>
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
