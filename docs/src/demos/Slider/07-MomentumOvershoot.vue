<template>
  <section class="demo">
    <h3>The thumb overshoots when you let go</h3>
    <p class="note">
      Flick the thumb and let go: it overshoots, then settles back on a <code>createSpring</code>,
      farther for a faster flick. The spring writes a <code>transform</code> on the exposed
      <code>thumbEls</code>, which adds to the <code>translate</code> Slider places the thumb with.
    </p>
    <div class="row">
      <Slider
        ref="slider"
        v-model="value"
        aria-label="Momentum value"
        :min="0"
        :max="100"
        class="slider"
      />
      <output class="demo-status">{{ value }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onScopeDispose, shallowRef, useTemplateRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import { Slider } from 'vael-ui'
import { createSpring } from 'vael-ui/motion'

const value = shallowRef(50)
const slider = useTemplateRef('slider')
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// The thumb's offset from where the value puts it, in px: thrown out, it springs back to 0.
const thumb = () => slider.value?.thumbEls?.[0]
const offset = createSpring(0, { damping: 0.35, response: 0.45 }, (x) => {
  const el = thumb()
  if (el) el.style.transform = x ? `translateX(${x}px)` : ''
})
onScopeDispose(() => offset.destroy())

let history: { x: number; t: number }[] = []
let dragging = false
onMounted(() =>
  useEventListener(thumb(), 'pointerdown', (event: PointerEvent) => {
    dragging = true
    history = [{ x: event.clientX, t: event.timeStamp }]
  }),
)
useEventListener(window, 'pointermove', (event: PointerEvent) => {
  if (!dragging) return
  history = [...history, { x: event.clientX, t: event.timeStamp }].slice(-5)
})
useEventListener(window, 'pointerup', () => {
  if (!dragging) return
  dragging = false
  const first = history[0]
  const last = history.at(-1)
  history = []
  if (reduced() || !first || !last || last.t === first.t) return
  // px per ms, scaled to the throw: faster, farther, up to 40px.
  const throwBy = Math.max(-40, Math.min(40, ((last.x - first.x) / (last.t - first.t)) * 60))
  if (Math.abs(throwBy) < 1) return
  offset.jump(throwBy)
  offset.set(0)
})
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.slider {
  flex: 1;
  max-inline-size: 20rem;
}
</style>
