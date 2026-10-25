<!-- InputNumber with every part: the field and its increment and decrement steppers. -->
<template>
  <div data-specimen class="specimen">
    <InputNumber v-model="seats" :min="1" :max="50" aria-label="Seats" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { InputNumber } from 'vael-ui'

const seats = shallowRef<number | null>(12)
</script>

<style scoped>
.specimen {
  inline-size: min(14rem, 100%);
}
</style>
