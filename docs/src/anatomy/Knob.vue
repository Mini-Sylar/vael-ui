<!-- Knob with every part: the dial, its track and fill, and the indicator. -->
<template>
  <div data-specimen class="specimen">
    <Knob v-model="volume" size="lg" aria-label="Volume" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Knob } from 'vael-ui'

const volume = shallowRef(65)
</script>

<style scoped>
.specimen {
  display: grid;
  justify-items: center;
  inline-size: min(18rem, 100%);
}
</style>
