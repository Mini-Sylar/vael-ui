<template>
  <section class="demo">
    <h3>Extreme: spring glide on key presses and track clicks (motion-v)</h3>
    <p class="note">
      Arrow keys and clicks on the track jump the value. Here the thumb and the fill glide there on
      a motion-v spring instead, while a drag still follows the pointer 1:1. Slider places both from
      one CSS variable, <code>--ui-slider-p0</code>, so the spring drives that variable on the
      exposed <code>trackEl</code> and the two always move together.
    </p>
    <div class="row slider-row">
      <Slider
        ref="slider"
        v-model="value"
        :min="MIN"
        :max="MAX"
        :step="10"
        style="max-width: 20rem"
      />
      <output class="demo-status">{{ value }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useMotionValue, useMotionValueEvent, useReducedMotion, useSpring } from 'motion-v'
import { Slider } from 'vael-ui'

const MIN = 0
const MAX = 100
const value = shallowRef(50)
const slider = useTemplateRef('slider')
const reduce = useReducedMotion()

const target = useMotionValue(value.value)
const glide = useSpring(target, { stiffness: 300, damping: 30 })

const fraction = (v: number) => String((v - MIN) / (MAX - MIN))

// Pressing the track starts a drag and jumps the value to the pointer. That first jump glides;
// once the pointer moves, it's a real drag and follows 1:1. Capture runs before Slider's handler.
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

// Runs before the DOM updates. Pin the track to where the thumb is now, so it doesn't flash to
// the new value for a frame before the spring takes over.
watch(value, (next, prev) => {
  const track = slider.value?.trackEl
  if (!track) return
  if ((slider.value?.dragging && !pressed) || reduce.value) {
    // A drag already moves 1:1, so it skips the spring.
    target.jump(next)
    glide.jump(next)
    return
  }
  if (!track.style.getPropertyValue('--ui-slider-p0')) {
    track.style.setProperty('--ui-slider-p0', fraction(prev))
  }
  target.set(next)
})

useMotionValueEvent(glide, 'change', (current) => {
  const track = slider.value?.trackEl
  if (!track) return
  // Close enough: hand the position back to Slider.
  if (Math.abs(current - value.value) < 0.05) track.style.removeProperty('--ui-slider-p0')
  else track.style.setProperty('--ui-slider-p0', fraction(current))
})
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
