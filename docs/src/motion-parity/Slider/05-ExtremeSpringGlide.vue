<template>
  <section class="demo">
    <h3>Extreme: spring glide on key presses and track clicks</h3>
    <p class="note">
      Arrow keys and clicks on the track glide the thumb and the fill to the new value on their own,
      while a drag still follows the pointer 1:1. The <code>ConfigProvider</code> motion spring sets
      how that glide moves.
    </p>
    <!-- motion-v's stiffness 300, damping 30 as a period and damping ratio -->
    <ConfigProvider :motion="{ spring: { damping: 0.866, response: 0.363 } }">
      <div class="row slider-row">
        <Slider
          v-model="value"
          aria-label="Glide value"
          :min="0"
          :max="100"
          :step="10"
          style="max-width: 20rem"
        />
        <output class="demo-status">{{ value }}</output>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { ConfigProvider, Slider } from 'vael-ui'

const value = shallowRef(50)
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
