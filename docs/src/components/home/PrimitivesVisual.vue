<template>
  <div class="primitives-visual">
    <Select v-model="fruit" :items="FRUITS" size="sm" class="mini-select" teleport-to="body" />
    <div class="row">
      <Switch v-model="on" size="sm" :aria-label="'Switch'" />
      <Slider v-model="level" :min="0" :max="100" class="mini-slider" :aria-label="'Slider'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Select, Slider, Switch } from 'vael-ui'

const FRUITS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Mango', value: 'mango' },
  { label: 'Papaya', value: 'papaya' },
]
const fruit = shallowRef('mango')
const on = shallowRef(true)
const level = shallowRef(60)
</script>

<style scoped>
.primitives-visual {
  display: grid;
  gap: 0.75rem;
  inline-size: min(100%, 15rem);
}

.row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.mini-slider {
  flex: 1;
}
</style>
