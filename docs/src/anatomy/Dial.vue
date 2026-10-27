<!-- Dial with every part: the dial, its track and fill, the ticks and the face with its value. -->
<template>
  <div data-specimen class="specimen">
    <Dial v-model="temperature" :min="10" :max="30" size="lg" aria-label="Temperature" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dial } from 'vael-ui'

// Bounded by min and max, so the fill is drawn.
const temperature = shallowRef(21)
</script>

<style scoped>
.specimen {
  display: grid;
  justify-items: center;
  inline-size: min(18rem, 100%);
}
</style>
