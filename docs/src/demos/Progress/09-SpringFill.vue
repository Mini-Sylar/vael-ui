<template>
  <section class="demo">
    <h3>Spring fill with vael-ui's spring</h3>
    <p class="note">
      The same jumpy feed as the GSAP example, driven by vael-ui's <code>createSpring</code> with no
      animation library. Each new value starts from where the fill is and keeps its speed, so a step
      back still moves as one motion. Damping below 1 overshoots.
    </p>
    <div class="row">
      <Progress ref="bar" :value="null" label="Upload" class="bar" />
      <Button size="sm" variant="outline" @click="run">Simulate</Button>
    </div>
    <Field :label="`Damping ${damping}`" class="tune">
      <Slider v-model="damping" :min="0.4" :max="1" :step="0.05" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { Button, createSpring, Field, Progress, Slider } from 'vael-ui'
import type { SpringHandle } from 'vael-ui'

const bar = useTemplateRef('bar')
const damping = shallowRef(0.6)
let spring: SpringHandle | undefined
let timer: ReturnType<typeof setInterval> | undefined

// A new spring per damping; it writes scaleX straight to the fill, so nothing re-renders.
function springFor(fill: HTMLElement | SVGElement): SpringHandle {
  spring?.destroy()
  return createSpring(spring?.value ?? 0, { damping: damping.value, response: 0.45 }, (x) => {
    fill.style.scale = `${Math.max(0, x)} 1`
  })
}
watch(damping, () => {
  const fill = bar.value?.fillEl
  if (fill && spring) spring = springFor(fill)
})

function run() {
  const fill = bar.value?.fillEl
  if (!fill) return
  fill.style.animation = 'none'
  fill.style.transition = 'none'
  fill.style.inlineSize = '100%'
  fill.style.transformOrigin = '0 50%'
  spring = springFor(fill)
  spring.jump(0)
  clearInterval(timer)
  const jumps = [0.15, 0.42, 0.3, 0.68, 0.55, 0.9, 1]
  let tick = 0
  timer = setInterval(() => {
    spring!.set(jumps[tick]!)
    if (++tick >= jumps.length) clearInterval(timer)
  }, 260)
}
onScopeDispose(() => {
  clearInterval(timer)
  spring?.destroy()
})
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-block-end: 1rem;
}
.bar {
  flex: 1;
  max-inline-size: 20rem;
}
.tune {
  max-inline-size: 16rem;
}
</style>
