<template>
  <section class="demo">
    <h3>Extreme: spring glide to a value set from code</h3>
    <p class="note">
      Slider glides on its own to any value set from code, here the preset buttons, and follows the
      <code>ConfigProvider</code> spring while it does. A drag still moves it 1:1. The readout rides
      a <code>useSpringValue</code> that chases the same value, and the thumb swells on focus
      through <code>motion.states</code>.
    </p>
    <div class="row slider-row">
      <Slider
        v-model="value"
        aria-label="Glide value"
        :min="0"
        :max="100"
        :step="1"
        :motion="{ states: { focus: { thumb: { scale: 1.15 } } } }"
        style="max-width: 20rem"
      />
      <output class="demo-status readout">{{ Math.round(shown) }}</output>
    </div>
    <div class="row">
      <Button
        v-for="preset in presets"
        :key="preset"
        size="sm"
        variant="outline"
        @click="value = preset"
      >
        {{ preset }}
      </Button>
      <Button size="sm" variant="outline" @click="value = Math.round(Math.random() * 100)"
        >Random</Button
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Button, Slider, useSpringValue } from 'vael-ui'

const presets = [0, 25, 75, 100]
const value = shallowRef(50)

const { value: shown, set } = useSpringValue(value.value, { damping: 0.85, response: 0.35 })
watch(value, (next) => set(next))
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
.readout {
  min-inline-size: 2.5rem;
  font-variant-numeric: tabular-nums;
}
</style>
