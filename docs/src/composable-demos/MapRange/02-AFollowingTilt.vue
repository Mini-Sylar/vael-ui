<template>
  <section class="demo">
    <h3>A card that leans toward the pointer</h3>
    <p class="note">
      Move over the card. <code>mapRange</code> turns the pointer's place on it into a tilt, and the
      getters in <code>v-animate</code> follow it every frame without rendering this component.
      Leaving, the pointer goes back to the middle and it settles.
    </p>
    <div ref="stage" class="stage" @pointermove="lean" @pointerleave="level">
      <div
        v-animate="{
          animate: {
            rotateX: { value: () => mapRange(y, [0, 1], [10, -10]), spring: 'smooth' },
            rotateY: { value: () => mapRange(x, [0, 1], [-12, 12]), spring: 'smooth' },
          },
        }"
        class="card"
      >
        <h4>Lisbon, 12 to 16 May</h4>
        <p>Four stops, one tram ride.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { mapRange, vAnimate } from 'vael-ui/motion'

// Measured on the stage, which doesn't tilt: the card's own box moves as it leans.
const stage = useTemplateRef<HTMLElement>('stage')
// Where the pointer is on the card, 0 to 1 on each side. Nothing in the template reads them, so
// moving the pointer never renders this component.
const x = shallowRef(0.5)
const y = shallowRef(0.5)
function lean(event: PointerEvent) {
  const box = stage.value!.getBoundingClientRect()
  x.value = (event.clientX - box.left) / box.width
  y.value = (event.clientY - box.top) / box.height
}
const level = () => {
  x.value = 0.5
  y.value = 0.5
}
</script>

<style scoped>
.stage {
  max-inline-size: 18rem;
  perspective: 600px;
}
.card {
  padding: 1.25rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) + 4px);
  background: var(--ui-surface);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.08);
}
h4,
p {
  margin: 0;
}
p {
  margin-block-start: 0.25rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
