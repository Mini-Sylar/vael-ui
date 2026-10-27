<!-- Slider with every part: the track, the fill between two thumbs of a range. -->
<template>
  <div data-specimen class="specimen">
    <Slider v-model="price" :min="0" :max="200" :step="5" aria-label="Price range" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Slider } from 'vael-ui'

// A range: two thumbs with the fill between them.
const price = shallowRef<[number, number]>([40, 140])
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
</style>
