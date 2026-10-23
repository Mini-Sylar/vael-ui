<template>
  <section class="demo">
    <h3>Extreme: the line fills and the next step pops</h3>
    <p class="note">
      Stepper fills its line on its own. Here each step's indicator marks itself with
      <code>v-animate</code> and <code>replay</code>, so it springs in again whenever its
      <code>completed</code> flips: forward arrivals pop, and Back unwinds them.
      <code>motion</code> with <code>initial</code> and <code>stagger</code> brings the steps in one
      after another when the page loads.
    </p>
    <Stepper v-model="step" :items="steps" :motion="intro" class="stepper-demo">
      <template #indicator="{ index, completed }">
        <span
          v-animate="{
            initial: { scale: 0.55, blur: 3, opacity: 0.4 },
            spring: { damping: 0.5, response: 0.45 },
            delay: 0.12,
            replay: completed,
          }"
          class="glyph"
          :data-done="completed ? '' : undefined"
        >
          <svg
            class="glyph-check"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8.5l3 3 7-7"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="glyph-number">{{ index + 1 }}</span>
        </span>
      </template>
    </Stepper>
    <div class="row">
      <Button variant="outline" :disabled="step === 0" @click="step--">Back</Button>
      <Button :disabled="step === steps.length - 1" @click="step++">Next</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Stepper, vAnimate } from 'vael-ui'
import type { StepperItem, StepperMotion } from 'vael-ui'

const steps: StepperItem[] = [
  { label: 'Account' },
  { label: 'Workspace' },
  { label: 'Invite' },
  { label: 'Launch' },
]
const step = shallowRef(1)

// The circles and labels rise in one after another on load.
const intro: StepperMotion = {
  stagger: 0.08,
  initial: {
    circle: { scale: 0.7, opacity: 0 },
    content: { opacity: 0, y: 4 },
  },
}
</script>

<style scoped>
.stepper-demo {
  max-inline-size: 32rem;
  margin-block-end: 1.25rem;
}
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.glyph {
  display: grid;
  place-items: center;
}
.glyph > * {
  grid-area: 1 / 1;
}
.glyph-check,
.glyph[data-done] .glyph-number {
  opacity: 0;
}
.glyph[data-done] .glyph-check {
  opacity: 1;
}
</style>
