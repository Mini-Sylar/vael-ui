<template>
  <section class="demo">
    <h3>Swatch opens the picker</h3>
    <p class="note">
      Drag on the plane for saturation and brightness, drag the hue slider, or type a hex value. In
      browsers with an EyeDropper, a button picks a color from the screen.
    </p>
    <div class="picker-row">
      <ColorPicker v-model="color" label="Accent" />
      <ColorPicker v-model="color" size="sm" label="Accent" />
      <ColorPicker v-model="color" size="lg" label="Accent" disabled />
      <span class="demo-status">{{ color }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { ColorPicker } from 'vael-ui'

const color = shallowRef('#3b82f6')
</script>

<style scoped>
.picker-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
