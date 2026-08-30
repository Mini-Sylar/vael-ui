<template>
  <section class="demo">
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
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dial } from 'vael-ui'

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
