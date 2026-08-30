<template>
  <section class="demo">
    <h3>Range, two cross-clamped thumbs</h3>
    <p class="note">
      Try dragging one thumb past the other, it stops flush against it instead of crossing.
    </p>
    <div class="row slider-row">
      <Slider v-model="range" :min="0" :max="100" style="max-width: 20rem" />
      <output class="note">{{ range[0] }} to {{ range[1] }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Slider } from 'vael-ui'

const range = shallowRef<[number, number]>([25, 70])
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
