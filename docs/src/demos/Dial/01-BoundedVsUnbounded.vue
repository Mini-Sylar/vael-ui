<template>
  <section class="demo">
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
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dial } from 'vael-ui'

const bounded = shallowRef(20)
const unbounded = shallowRef(0)
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
