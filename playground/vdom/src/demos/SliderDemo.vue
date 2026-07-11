<template>
  <section class="demo">
    <h2>Slider</h2>
    <p class="note">
      Pure direct manipulation: <code>useSlider</code> commits the model on every pointermove frame
      — there is no CSS transition on the thumb/fill position, only a hover/press feedback
      <code>scale</code>. Drag, then reverse direction mid-drag: the thumb never lags or glitches.
      Position rides two 0–1 fraction custom properties set on the root
      (<code>--ui-slider-p0</code>/ <code>-p1</code>) — thumbs carry no inline style of their own.
    </p>

    <h3>Single value</h3>
    <div class="row slider-row">
      <Slider v-model="volume" :min="0" :max="100" :step="1" style="max-width: 20rem" />
      <output class="note">{{ volume }}</output>
    </div>

    <h3>Stepped, with <code>valueText</code></h3>
    <div class="row slider-row">
      <Slider
        v-model="price"
        :min="0"
        :max="200"
        :step="5"
        :value-text="(v) => `$${v}`"
        style="max-width: 20rem"
      />
      <output class="note">${{ price }}</output>
    </div>

    <h3>Range — two cross-clamped thumbs</h3>
    <p class="note">
      Try dragging one thumb past the other — it stops flush against it instead of crossing.
    </p>
    <div class="row slider-row">
      <Slider v-model="range" :min="0" :max="100" style="max-width: 20rem" />
      <output class="note">{{ range[0] }} – {{ range[1] }}</output>
    </div>

    <h3>Vertical</h3>
    <div class="row slider-row" style="align-items: flex-start">
      <Slider v-model="verticalValue" orientation="vertical" :min="0" :max="100" />
      <output class="note">{{ verticalValue }}</output>
    </div>

    <h3>Disabled</h3>
    <div class="row slider-row">
      <Slider v-model="disabledValue" disabled :min="0" :max="100" style="max-width: 20rem" />
    </div>

    <h3>Inside a Field</h3>
    <Field label="Brightness" description="Applies to the whole display." style="max-width: 20rem">
      <Slider v-model="brightness" :min="0" :max="100" />
    </Field>

    <h3>Plain <code>&lt;form&gt;</code> participation</h3>
    <p class="note">A slider with a <code>name</code> renders hidden input(s) automatically.</p>
    <form class="row slider-row" style="align-items: center" @submit.prevent="onSubmit">
      <Slider v-model="formValue" name="quantity" :min="1" :max="10" style="max-width: 16rem" />
      <Button type="submit" size="sm">Submit</Button>
      <output class="note">{{ submitted }}</output>
    </form>

    <h3>Extreme: GSAP momentum &amp; rubber-band release (gsap)</h3>
    <p class="note">
      Flick the thumb and let go — it overshoots past the release point and eases back, scaled to
      release velocity. This rides <code>thumbEls</code> directly: the thumb's own position is set
      via the standalone CSS <code>translate</code> property, and GSAP's <code>x</code> tween
      animates the separate <code>transform</code> property — two independent CSS properties that
      compose additively on the same element, so GSAP's tween layers on top of the library's own
      position instead of fighting it — no wrapper element needed. The fill also uses
      <code>translate</code>/<code>scale</code> for its own positioning, so it's deliberately left
      alone here; animating it the same way would need the wrapper-div pattern from the Toast
      finding. <code>clearProps</code> wipes the tween's inline transform once it settles so a later
      drag measures a clean position again.
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
import { Button, Field, Slider } from 'vael-ui'

const volume = shallowRef(40)
const price = shallowRef(75)
const range = shallowRef<[number, number]>([25, 70])
const verticalValue = shallowRef(30)
const disabledValue = shallowRef(60)
const brightness = shallowRef(80)
const formValue = shallowRef(3)
const submitted = shallowRef('')

function onSubmit(event: Event) {
  const data = new FormData(event.target as HTMLFormElement)
  submitted.value = `quantity=${data.get('quantity')}`
}

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
  gsap.fromTo(
    thumb,
    { x: overshoot },
    { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'x' },
  )
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
