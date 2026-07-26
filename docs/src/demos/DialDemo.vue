<template>
  <section class="demo">
    <h2>Dial</h2>
    <p class="note">
      Continuous-rotation counterpart to Knob: no fixed sweep, no dead zone, grab it and spin,
      clockwise always increases the value and counter-clockwise always decreases it, no matter how
      many full turns happen. <code>useDial</code> accumulates the shortest angular delta between
      consecutive pointer positions each drag frame (wraparound-safe against the atan2 +180/-180
      seam) instead of reading one absolute angle the way Knob does. The whole tick ring spins with
      the pointer 1:1, even a bounded dial's ring keeps turning once the value clamps, the same way
      a real jog wheel never stalls under your finger.
    </p>

    <h3>Bounded vs. unbounded</h3>
    <p class="note">
      Bounded shows a static progress ring underneath the spinning ticks and clamps at
      <code>min</code>/<code>max</code>; unbounded has no fill ring (there is no range to show
      progress through) and simply keeps counting, drag it several full turns and watch the number
      climb with no ceiling.
    </p>
    <div class="row dial-row">
      <div class="dial-cell">
        <Dial v-model="bounded" :min="0" :max="100" :step="1" />
        <p class="note">bounded 0-100, clamps at both ends</p>
      </div>
      <div class="dial-cell">
        <Dial v-model="unbounded" :step="1" />
        <p class="note">unbounded, {{ unbounded }}, no ceiling or floor</p>
      </div>
    </div>

    <h3>Sensitivity (<code>degreesPerStep</code>)</h3>
    <p class="note">
      Default is 15deg/step (a full turn = 24 steps, matching the traditional mechanical mouse-wheel
      notch). A coarse value range wants fewer, bigger degrees-per-step so a full spin doesn't blow
      past the whole range in one gesture.
    </p>
    <div class="row dial-row">
      <div class="dial-cell">
        <Dial v-model="fine" :min="0" :max="1000" :step="10" :degrees-per-step="6" />
        <p class="note">fine: 6deg/step, 0-1000 by 10</p>
      </div>
      <div class="dial-cell">
        <Dial v-model="coarse" :min="0" :max="10" :step="1" :degrees-per-step="45" />
        <p class="note">coarse: 45deg/step, 0-10 by 1</p>
      </div>
    </div>

    <h3>Sizes and disabled state</h3>
    <div class="row dial-row" style="align-items: flex-end">
      <Dial v-model="smValue" size="sm" :min="0" :max="10" />
      <Dial v-model="mdValue" size="md" :min="0" :max="10" />
      <Dial v-model="lgValue" size="lg" :min="0" :max="10" />
      <Dial v-model="disabledValue" disabled size="md" :min="0" :max="100" />
    </div>

    <h3>Form integration</h3>
    <p class="note">
      <code>Field</code> wires up the label/description without extra ARIA plumbing. Separately, any
      Dial with a <code>name</code> renders a hidden input automatically, so it participates in a
      plain <code>&lt;form&gt;</code> submit with no extra wiring.
    </p>
    <Field label="Playback pitch" description="Unbounded, spin freely up or down.">
      <Dial v-model="fieldValue" :value-text="(v) => `${v > 0 ? '+' : ''}${v} st`" />
    </Field>
    <form
      class="row dial-row"
      style="align-items: center; margin-top: 1rem"
      @submit.prevent="onSubmit"
    >
      <Dial v-model="formValue" name="zoom" :min="0" :max="200" />
      <Button type="submit" size="sm">Submit</Button>
      <output class="note">{{ submitted }}</output>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dial, Field } from 'vael-ui'

const bounded = shallowRef(20)
const unbounded = shallowRef(0)
const fine = shallowRef(500)
const coarse = shallowRef(5)
const smValue = shallowRef(3)
const mdValue = shallowRef(5)
const lgValue = shallowRef(7)
const disabledValue = shallowRef(60)
const fieldValue = shallowRef(0)
const formValue = shallowRef(100)
const submitted = shallowRef('')

function onSubmit(event: Event) {
  const data = new FormData(event.target as HTMLFormElement)
  submitted.value = `zoom=${data.get('zoom')}`
}
</script>

<style scoped>
.dial-row {
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.dial-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
</style>
