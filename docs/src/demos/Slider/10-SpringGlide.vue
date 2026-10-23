<template>
  <section class="demo">
    <h3>Spring glide with vael-ui's spring</h3>
    <p class="note">
      The motion-v example above, rebuilt on vael-ui's <code>createSpring</code> with no animation
      library. Arrow keys and track clicks glide the thumb and the fill on the spring, and a drag
      still follows the pointer 1:1. The spring writes <code>--ui-slider-p0</code> on the exposed
      <code>trackEl</code> each frame and removes it once it settles.
    </p>
    <div class="row">
      <Slider
        ref="slider"
        v-model="value"
        aria-label="Glide value"
        :min="MIN"
        :max="MAX"
        :step="10"
        class="slider"
      />
      <output class="demo-status">{{ value }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { createSpring, Slider } from 'vael-ui'

const MIN = 0
const MAX = 100
const value = shallowRef(50)
const slider = useTemplateRef('slider')
const fraction = (v: number) => String((v - MIN) / (MAX - MIN))
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const glide = createSpring(value.value, { damping: 0.85, response: 0.35 }, (current) => {
  const track = slider.value?.trackEl
  if (!track) return
  // Close enough: hand the position back to Slider.
  if (Math.abs(current - value.value) < 0.05) track.style.removeProperty('--ui-slider-p0')
  else track.style.setProperty('--ui-slider-p0', fraction(current))
})
onScopeDispose(() => glide.destroy())

// A press on the track jumps the value; that first jump glides, then a real drag follows 1:1.
let pressed = false
useEventListener(
  () => slider.value?.trackEl,
  'pointerdown',
  () => (pressed = true),
  {
    capture: true,
  },
)
useEventListener(
  () => slider.value?.trackEl,
  'pointermove',
  () => (pressed = false),
)

// Runs before the DOM updates, so the track never flashes to the new value first.
watch(value, (next, prev) => {
  const track = slider.value?.trackEl
  if (!track) return
  if ((slider.value?.dragging && !pressed) || reduced()) {
    glide.jump(next)
    return
  }
  if (!track.style.getPropertyValue('--ui-slider-p0')) {
    track.style.setProperty('--ui-slider-p0', fraction(prev))
  }
  glide.set(next)
})
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.slider {
  max-inline-size: 20rem;
}
</style>
