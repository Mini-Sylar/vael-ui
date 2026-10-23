<template>
  <section class="demo">
    <h3>Extreme: flick the thumb and it carries on</h3>
    <p class="note">
      Drag the thumb and let go mid-flick. On release, the demo works out how fast you were moving
      and sets a value further along, a throw scaled to your speed. Slider glides to a value set
      from code on its own, and the <code>ConfigProvider</code> spring here is bouncy, so the thumb
      overshoots the landing and settles back. A drag itself still follows the pointer 1:1.
    </p>
    <ConfigProvider :motion="{ version: 1, spring: { damping: 0.55, response: 0.55 } }">
      <div
        class="row slider-row"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="history = []"
      >
        <Slider
          ref="slider"
          v-model="value"
          aria-label="Momentum value"
          :min="MIN"
          :max="MAX"
          style="max-width: 20rem"
        />
        <output class="demo-status">{{ value }}</output>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { ConfigProvider, Slider } from 'vael-ui'

const MIN = 0
const MAX = 100
const value = shallowRef(50)
const slider = useTemplateRef('slider')

// The last few pointer samples, to read the release speed from.
let history: { x: number; t: number }[] = []
function onDown(event: PointerEvent) {
  history = [{ x: event.clientX, t: event.timeStamp }]
}
function onMove(event: PointerEvent) {
  if (!history.length) return
  history.push({ x: event.clientX, t: event.timeStamp })
  if (history.length > 5) history.shift()
}
function onUp() {
  const first = history[0]
  const last = history[history.length - 1]
  history = []
  const width = slider.value?.trackEl?.getBoundingClientRect().width
  if (!first || !last || !width || last.t === first.t) return
  // Value units per ms, then thrown 250 ms ahead, so a faster flick travels further.
  const speed = ((last.x - first.x) / (last.t - first.t) / width) * (MAX - MIN)
  const thrown = Math.round(Math.min(MAX, Math.max(MIN, value.value + speed * 250)))
  if (Math.abs(thrown - value.value) < 2) return
  // Slider reads a value set a beat after the drag as "from code" and glides to it.
  setTimeout(() => (value.value = thrown), 80)
}
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
