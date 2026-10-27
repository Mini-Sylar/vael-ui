<template>
  <section class="demo">
    <h3>Bounded and unbounded</h3>
    <p class="note">
      A bounded Dial shows a progress ring under the spinning ticks and stops at
      <code>min</code> and <code>max</code>. An unbounded one has no ring, since there’s no range to
      fill, and keeps counting: drag it several full turns and the number keeps climbing.
    </p>
    <div class="row dial-row">
      <div class="dial-cell">
        <Field label="Bounded">
          <Dial v-model="bounded" :min="0" :max="100" :step="1" />
        </Field>
        <p class="demo-status">bounded 0-100, clamps at both ends</p>
      </div>
      <div class="dial-cell">
        <Field label="Unbounded">
          <Dial v-model="unbounded" :step="1" />
        </Field>
        <p class="demo-status">unbounded, {{ unbounded }}, no ceiling or floor</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dial, Field } from 'vael-ui'

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
