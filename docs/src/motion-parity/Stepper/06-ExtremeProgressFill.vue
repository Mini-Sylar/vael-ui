<template>
  <section class="demo">
    <h3>Extreme: the line fills and the next step pops</h3>
    <p class="note">
      Stepper fills its line and lights the next circle on its own; <code>motion</code>'s
      <code>duration</code> and <code>easing</code> retime both, quicker going back.
      <code>states.current</code> pops the circle the fill arrives at, with a
      <code>delay</code> that waits for the fill. Inside each circle, <code>v-animate</code> with
      <code>replay</code> blurs the number into a check.
    </p>
    <Stepper v-model="step" :items="steps" :motion="fill" class="stepper-demo">
      <template #indicator="{ index, completed }">
        <span class="glyph" :data-done="completed ? '' : undefined">
          <svg
            v-animate="swap(index, completed)"
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
          <span v-animate="swap(index, !completed)" class="glyph-number">{{ index + 1 }}</span>
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
import { computed, reactive, shallowRef, watch } from 'vue'
import { Button, Stepper, vAnimate } from 'vael-ui'
import type { StepperItem, StepperMotion } from 'vael-ui'

const steps: StepperItem[] = [
  { label: 'Account' },
  { label: 'Workspace' },
  { label: 'Invite' },
  { label: 'Launch' },
]
const step = shallowRef(1)

// GSAP's fill: power2.inOut, 350ms forward and 220ms back.
const FILL = 350
const DRAIN = 220
const forward = shallowRef(true)
// Bumped when a step's number and check swap places (they cross-fade). Set before the circles update.
const swaps = reactive(steps.map(() => 0))
watch(step, (to, from) => {
  forward.value = to > from
  for (let i = Math.min(from, to); i < Math.max(from, to); i++) swaps[i]!++
})

// Going forward, the circle the fill arrives at grows to 1.15 in 90ms (power2.out), then settles
// on GSAP's elastic.out(1, 0.4) in 500ms: one curve from 1.15 to its own size, starting at rest.
const POP_MS = 590
const RISE = 90 / POP_MS
const point = (value: number, at: number) => `${+value.toFixed(4)} ${+(at * 100).toFixed(2)}%`
const POP = `linear(${[
  ...Array.from({ length: 10 }, (_, i) => point((1 - i / 10) ** 3, (RISE * i) / 10)),
  ...Array.from({ length: 61 }, (_, i) => {
    const u = i / 60
    const elastic = u === 1 ? 1 : 2 ** (-10 * u) * Math.sin(((u - 0.1) * 2 * Math.PI) / 0.4) + 1
    return point(elastic, RISE + (1 - RISE) * u)
  }),
].join(', ')})`

const fill = computed<StepperMotion>(() => ({
  duration: forward.value ? FILL : DRAIN,
  easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  states: {
    current: forward.value
      ? {
          circle: {
            scale: { value: [1.15, 1], duration: POP_MS, easing: POP, delay: FILL / 1000 },
          },
        }
      : {},
  },
}))

// The one showing now fades in out of a blur; the other fades out. Forward, the step the fill
// leaves swaps at once; back, it waits for the drain to reach it.
const swap = (index: number, shown: boolean) => ({
  initial: shown ? { opacity: 0, blur: 3 } : { opacity: 1 },
  duration: 180,
  easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  delay: forward.value ? 0 : DRAIN / 1000,
  replay: swaps[index],
})
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
