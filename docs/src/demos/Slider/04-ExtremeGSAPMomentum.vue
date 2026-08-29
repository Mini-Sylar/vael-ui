<template>
  <section class="demo">
    <h3>Extreme: GSAP momentum &amp; rubber-band release (gsap)</h3>
    <p class="note">
      Flick the thumb and let go, it overshoots past the release point and eases back, scaled to
      release velocity. The thumb's real position is set via the standalone CSS
      <code>translate</code> property; GSAP tweens a plain JS object (not the thumb element itself)
      and each tick writes the result to the thumb's <code>transform</code>, a separate property
      that composes additively with <code>translate</code> — handing GSAP the element directly would
      have it clear <code>translate</code> to own the whole transform stack itself.
    </p>
    <div class="row slider-row">
      <Slider
        ref="momentumSlider"
        v-model="momentumValue"
        :min="0"
        :max="100"
        style="max-width: 20rem"
      />
      <output class="note">{{ momentumValue }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Slider } from 'vael-ui'

const momentumValue = shallowRef(50)
const momentumSlider = useTemplateRef<InstanceType<typeof Slider>>('momentumSlider')
const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let history: { x: number; t: number }[] = []
let dragging = false

function onThumbPointerdown(event: PointerEvent) {
  dragging = true
  history = [{ x: event.clientX, t: event.timeStamp }]
}
function onWindowPointermove(event: PointerEvent) {
  if (!dragging) return
  history.push({ x: event.clientX, t: event.timeStamp })
  if (history.length > 5) history.shift()
}
function onWindowPointerup() {
  if (!dragging) return
  dragging = false
  const thumb = momentumSlider.value?.thumbEls?.[0]
  const first = history[0]
  const last = history[history.length - 1]
  history = []
  if (!thumb || reduce() || !first || !last || last.t === first.t) return
  const velocity = (last.x - first.x) / (last.t - first.t) // px/ms
  const overshoot = gsap.utils.clamp(-40, 40, velocity * 60)
  if (Math.abs(overshoot) < 1) return
  const state = { x: overshoot }
  gsap.to(state, {
    x: 0,
    duration: 0.6,
    ease: 'elastic.out(1, 0.5)',
    onUpdate: () => {
      thumb.style.transform = `translateX(${state.x}px)`
    },
    onComplete: () => {
      thumb.style.transform = ''
    },
  })
}

onMounted(() => {
  const thumb = momentumSlider.value?.thumbEls?.[0]
  thumb?.addEventListener('pointerdown', onThumbPointerdown)
  window.addEventListener('pointermove', onWindowPointermove)
  window.addEventListener('pointerup', onWindowPointerup)
})
onUnmounted(() => {
  momentumSlider.value?.thumbEls?.[0]?.removeEventListener('pointerdown', onThumbPointerdown)
  window.removeEventListener('pointermove', onWindowPointermove)
  window.removeEventListener('pointerup', onWindowPointerup)
})
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
