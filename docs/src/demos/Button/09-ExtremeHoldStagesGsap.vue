<template>
  <section class="demo">
    <h3>Extreme: the label changes as you hold (GSAP)</h3>
    <p class="note">
      The default slot gets <code>holdProgress</code>, from 0 to 1, so the label can change at 20%,
      50% and 100%, crossfading with AnimatedText. The button also sets
      <code>--ui-hold-progress</code>, which CSS reads here to deepen the colour as you hold. GSAP
      adds a shake that grows past 60% and a pop when it completes.
    </p>
    <Button
      ref="button"
      variant="danger"
      :hold="2000"
      class="stages"
      @click="onDeleted"
      @pointerup="calm"
      @pointerleave="calm"
    >
      <template #default="{ holdProgress }">
        <AnimatedText :value="labelFor(holdProgress)" />
      </template>
    </Button>
    <p class="demo-status">Deleted {{ deleted }} times.</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { AnimatedText, Button } from 'vael-ui'

const deleted = shallowRef(0)
const button = useTemplateRef('button')

function labelFor(progress: number): string {
  if (progress >= 1) return 'Deleted'
  if (progress >= 0.5) return 'Almost there…'
  if (progress >= 0.2) return 'Keep holding'
  return 'Hold to delete'
}

// Past 60% the button trembles, harder the closer it gets.
let shake: gsap.core.Tween | undefined
watch(
  () => button.value?.holdProgress ?? 0,
  (progress) => {
    const el = button.value?.el
    if (!el || progress < 0.6 || progress >= 1) return
    shake ??= gsap.to(el, { x: 1.5, duration: 0.05, repeat: -1, yoyo: true, ease: 'none' })
    shake.timeScale(1 + (progress - 0.6) * 4)
  },
)
function calm() {
  shake?.kill()
  shake = undefined
  if (button.value?.el) gsap.to(button.value.el, { x: 0, duration: 0.15, ease: 'power2.out' })
}
function onDeleted() {
  deleted.value++
  calm()
  const el = button.value?.el
  if (el) gsap.fromTo(el, { scale: 1.06 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
}
</script>

<style scoped>
.stages {
  min-inline-size: 11rem;
  --ui-button-bg: color-mix(
    in oklab,
    var(--ui-danger) calc(100% - var(--ui-hold-progress, 0) * 30%),
    black
  );
}
</style>
