<template>
  <section class="demo">
    <h2>Knob</h2>
    <p class="note">
      A rotary counterpart to Slider: dragging computes the pointer's angle relative to the dial's
      own center (<code>getBoundingClientRect()</code>) and maps it onto a fixed 270° sweep
      (<code>-135deg</code>..<code>135deg</code>, a 90° gap at the bottom) — the same "never
      transition a live drag" rule as Slider applies to the rotation angle and fill arc. Grab
      anywhere on the dial: the value jumps to that angle immediately (there's no separate
      track/thumb split on a circular control), then drag — the indicator tracks 1:1, no lag.
    </p>

    <h3>Single value</h3>
    <div class="row knob-row">
      <Knob v-model="volume" :min="0" :max="100" :step="1" />
      <output class="note">{{ volume }}</output>
    </div>

    <h3>Custom <code>step</code>, with <code>valueText</code></h3>
    <div class="row knob-row">
      <Knob v-model="gain" :min="-24" :max="24" :step="3" :value-text="(v) => `${v} dB`" />
      <output class="note">{{ gain }} dB</output>
    </div>

    <h3>Sizes</h3>
    <div class="row knob-row" style="align-items: flex-end">
      <Knob v-model="smValue" size="sm" :min="0" :max="10" />
      <Knob v-model="mdValue" size="md" :min="0" :max="10" />
      <Knob v-model="lgValue" size="lg" :min="0" :max="10" />
    </div>

    <h3>Disabled</h3>
    <div class="row knob-row">
      <Knob v-model="disabledValue" disabled :min="0" :max="100" />
    </div>

    <h3>Inside a Field</h3>
    <Field label="Master volume" description="0-100, drag or use the arrow keys.">
      <Knob v-model="fieldValue" :min="0" :max="100" />
    </Field>

    <h3>Plain <code>&lt;form&gt;</code> participation</h3>
    <p class="note">A knob with a <code>name</code> renders a hidden input automatically.</p>
    <form class="row knob-row" style="align-items: center" @submit.prevent="onSubmit">
      <Knob v-model="formValue" name="brightness" :min="0" :max="100" />
      <Button type="submit" size="sm">Submit</Button>
      <output class="note">{{ submitted }}</output>
    </form>

    <h3>Extreme: GSAP settle wobble on release (gsap)</h3>
    <p class="note">
      Flick the knob and let go — the indicator overshoots past the release angle and eases back,
      scaled to release velocity. This rides <code>indicatorEl</code> directly: the dot's rotation
      to the current value is owned entirely by its parent pivot's CSS <code>rotate</code> (reading
      <code>--ui-knob-angle</code>), so <code>indicatorEl</code> itself carries no Vue-managed
      inline style of its own — GSAP's <code>rotate</code> tween on the dot composes additively on
      top of the library's positioning instead of fighting it, same reasoning as the Slider momentum
      demo's <code>x</code> tween on the thumb. <code>clearProps</code> wipes the tween's inline
      transform once it settles so a later drag measures a clean position again.
    </p>
    <div class="row knob-row">
      <Knob ref="momentumKnob" v-model="momentumValue" :min="0" :max="100" />
      <output class="note">{{ momentumValue }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Button, Field, Knob } from 'vael-ui'

const volume = shallowRef(40)
const gain = shallowRef(0)
const smValue = shallowRef(3)
const mdValue = shallowRef(5)
const lgValue = shallowRef(7)
const disabledValue = shallowRef(60)
const fieldValue = shallowRef(80)
const formValue = shallowRef(50)
const submitted = shallowRef('')

function onSubmit(event: Event) {
  const data = new FormData(event.target as HTMLFormElement)
  submitted.value = `brightness=${data.get('brightness')}`
}

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
