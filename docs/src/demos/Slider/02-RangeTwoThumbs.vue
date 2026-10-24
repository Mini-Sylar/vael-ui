<template>
  <section class="demo">
    <h3>Range with two thumbs that never cross</h3>
    <p class="note">Drag one thumb past the other: it stops against it instead of crossing.</p>
    <div class="row slider-row">
      <Field label="Price range" class="slider-field">
        <Slider v-model="range" :min="0" :max="100" />
      </Field>
      <output class="demo-status">{{ range[0] }} to {{ range[1] }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Slider } from 'vael-ui'

const range = shallowRef<[number, number]>([25, 70])
</script>

<style scoped>
.slider-row {
  align-items: flex-end;
  gap: 1rem;
}

.slider-field {
  inline-size: 100%;
  max-inline-size: 20rem;
}
</style>
