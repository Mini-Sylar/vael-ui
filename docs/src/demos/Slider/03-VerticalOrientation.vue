<template>
  <section class="demo">
    <h3>Vertical orientation</h3>
    <div class="row slider-row" style="align-items: flex-start">
      <Slider v-model="verticalValue" orientation="vertical" :min="0" :max="100" />
      <output class="note">{{ verticalValue }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Slider } from 'vael-ui'

const verticalValue = shallowRef(30)
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
