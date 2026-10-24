<template>
  <section class="demo">
    <h3>Sensitivity (<code>degreesPerStep</code>)</h3>
    <p class="note">
      The default is 15° per step, so a full turn is 24 steps, like the notches of a mouse wheel. A
      coarse range needs more degrees per step, so one spin doesn’t run through the whole range.
    </p>
    <div class="row dial-row">
      <div class="dial-cell">
        <Field label="Fine">
          <Dial v-model="fine" :min="0" :max="1000" :step="10" :degrees-per-step="6" />
        </Field>
        <p class="note">fine: 6deg/step, 0-1000 by 10</p>
      </div>
      <div class="dial-cell">
        <Field label="Coarse">
          <Dial v-model="coarse" :min="0" :max="10" :step="1" :degrees-per-step="45" />
        </Field>
        <p class="note">coarse: 45deg/step, 0-10 by 1</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dial, Field } from 'vael-ui'

const fine = shallowRef(500)
const coarse = shallowRef(5)
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
