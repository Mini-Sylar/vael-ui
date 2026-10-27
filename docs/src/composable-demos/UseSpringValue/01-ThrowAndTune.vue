<template>
  <section class="demo">
    <h3>Throw it, then tune it</h3>
    <p class="note">
      Drag the puck and let go. It springs to the nearer end of the track, starting at the speed
      your pointer left it with, so the release has no seam. Grab it again mid-flight: the spring
      picks up from where it is. Lower the damping below 1 to see it overshoot, and raise the
      response to slow it down. <code>createSpring</code> writes each frame straight to the puck's
      style, so nothing re-renders.
    </p>
    <div ref="track" class="spring-track">
      <button
        ref="puck"
        type="button"
        class="spring-puck"
        aria-label="Puck"
        @pointerdown="onPointerDown"
        @keydown.left.prevent="send(0)"
        @keydown.right.prevent="send(travel())"
      />
    </div>
    <div class="row spring-controls">
      <Field :label="`Damping ${damping.toFixed(2)}`" class="spring-field">
        <Slider v-model="damping" :min="0.2" :max="1.4" :step="0.05" />
      </Field>
      <Field :label="`Response ${response.toFixed(2)} s`" class="spring-field">
        <Slider v-model="response" :min="0.1" :max="1" :step="0.05" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { Field, Slider } from 'vael-ui'
import { createSpring } from 'vael-ui/motion'
import type { SpringHandle } from 'vael-ui/motion'

const damping = shallowRef(0.6)
const response = shallowRef(0.45)

const track = useTemplateRef<HTMLElement>('track')
const puck = useTemplateRef<HTMLElement>('puck')

function paint(x: number) {
  if (puck.value) puck.value.style.translate = `${x}px 0`
}

let spring: SpringHandle = createSpring(
  0,
  { damping: damping.value, response: response.value },
  paint,
)

// Options are read once, so a new spring takes over mid-flight, at the same speed.
watch([damping, response], () => {
  const { value, target, velocity } = spring
  spring.destroy()
  spring = createSpring(value, { damping: damping.value, response: response.value }, paint)
  spring.set(target, { velocity })
})

function travel(): number {
  if (!track.value || !puck.value) return 0
  return track.value.clientWidth - puck.value.offsetWidth - 8
}

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function send(target: number, velocity?: number) {
  if (reduceMotion()) spring.jump(target)
  else spring.set(target, { velocity })
}

// Pointer speed over the last few moves, in px per second.
let samples: { x: number; t: number }[] = []
let startX = 0
let startValue = 0

function onPointerDown(event: PointerEvent) {
  puck.value?.setPointerCapture(event.pointerId)
  spring.stop()
  startX = event.clientX
  startValue = spring.value
  samples = [{ x: event.clientX, t: event.timeStamp }]
  puck.value?.addEventListener('pointermove', onPointerMove)
  puck.value?.addEventListener('pointerup', onPointerUp, { once: true })
  puck.value?.addEventListener('pointercancel', onPointerUp, { once: true })
}

function onPointerMove(event: PointerEvent) {
  const x = Math.min(Math.max(startValue + event.clientX - startX, 0), travel())
  spring.jump(x)
  samples.push({ x: event.clientX, t: event.timeStamp })
  samples = samples.filter((s) => event.timeStamp - s.t < 80)
}

function onPointerUp(event: PointerEvent) {
  puck.value?.removeEventListener('pointermove', onPointerMove)
  const first = samples[0]
  const dt = first ? (event.timeStamp - first.t) / 1000 : 0
  const velocity = first && dt > 0 ? (event.clientX - first.x) / dt : 0
  // Project where the throw would carry it, then pick the nearer end.
  const projected = spring.value + velocity * 0.15
  send(projected > travel() / 2 ? travel() : 0, velocity)
}

onMounted(() => spring.jump(0))
onBeforeUnmount(() => spring.destroy())
</script>

<style scoped>
.spring-track {
  position: relative;
  max-inline-size: 28rem;
  padding: 4px;
  border-radius: 999px;
  background: var(--ui-muted);
}
.spring-puck {
  display: block;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border: none;
  border-radius: 999px;
  background: var(--ui-primary);
  box-shadow: var(--ui-panel-shadow);
  cursor: grab;
  touch-action: none;
}
.spring-puck:active {
  cursor: grabbing;
}
.spring-controls {
  gap: 1.5rem;
}
.spring-field {
  inline-size: 12rem;
}
</style>
