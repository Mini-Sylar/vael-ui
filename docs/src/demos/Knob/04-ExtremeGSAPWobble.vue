<template>
  <section class="demo">
    <h3>Extreme: the dot wobbles as it settles (gsap)</h3>
    <p class="note">
      Flick the knob and let go: the dot swings past the release angle and settles back, further for
      a faster flick. GSAP tweens <code>rotate</code> on the exposed <code>indicatorEl</code>. The
      dot’s position comes from its parent’s CSS <code>rotate</code>, which reads
      <code>--ui-knob-angle</code>, so the tween adds to it instead of replacing it.
      <code>clearProps</code> removes the inline style once it settles, so the next drag starts
      clean.
    </p>
    <div class="row knob-row">
      <Knob
        ref="momentumKnob"
        v-model="momentumValue"
        :min="0"
        :max="100"
        aria-label="Momentum value"
      />
      <output class="demo-status">{{ momentumValue }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Knob } from 'vael-ui'

const momentumValue = shallowRef(50)
const momentumKnob = useTemplateRef<InstanceType<typeof Knob>>('momentumKnob')
const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Convention: 0deg-up, clockwise-positive (matches useKnob.ts)
function angleFromCenter(el: HTMLElement, clientX: number, clientY: number): number {
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI
}

let history: { angle: number; t: number }[] = []
let dragging = false

function onDialPointerdown(event: PointerEvent) {
  const dial = momentumKnob.value?.dialEl
  if (!dial) return
  dragging = true
  history = [{ angle: angleFromCenter(dial, event.clientX, event.clientY), t: event.timeStamp }]
}
function onWindowPointermove(event: PointerEvent) {
  if (!dragging) return
  const dial = momentumKnob.value?.dialEl
  if (!dial) return
  history.push({ angle: angleFromCenter(dial, event.clientX, event.clientY), t: event.timeStamp })
  if (history.length > 5) history.shift()
}
function onWindowPointerup() {
  if (!dragging) return
  dragging = false
  const indicator = momentumKnob.value?.indicatorEl
  const first = history[0]
  const last = history[history.length - 1]
  history = []
  if (!indicator || reduce() || !first || !last || last.t === first.t) return
  const velocity = (last.angle - first.angle) / (last.t - first.t) // deg/ms
  const overshoot = gsap.utils.clamp(-45, 45, velocity * 60)
  if (Math.abs(overshoot) < 1) return
  gsap.fromTo(
    indicator,
    { rotate: overshoot },
    { rotate: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'rotate' },
  )
}

onMounted(() => {
  const dial = momentumKnob.value?.dialEl
  dial?.addEventListener('pointerdown', onDialPointerdown)
  window.addEventListener('pointermove', onWindowPointermove)
  window.addEventListener('pointerup', onWindowPointerup)
})
onUnmounted(() => {
  momentumKnob.value?.dialEl?.removeEventListener('pointerdown', onDialPointerdown)
  window.removeEventListener('pointermove', onWindowPointermove)
  window.removeEventListener('pointerup', onWindowPointerup)
})
</script>

<style scoped>
.knob-row {
  align-items: center;
  gap: 1.5rem;
}
</style>
