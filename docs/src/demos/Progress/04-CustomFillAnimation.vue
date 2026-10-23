<template>
  <section class="demo">
    <h3>Custom fill animation (GSAP)</h3>
    <p class="note">
      <code>value</code> stays <code>null</code> here. GSAP tweens the <code>scaleX</code> of the
      exposed <code>fillEl</code> directly, after the demo turns off the fill's built-in animation
      and transition. The fake feed jumps around, including a step back, and each new tween starts
      from wherever the fill is.
    </p>
    <div class="row progress-row">
      <Progress
        ref="gsapProgress"
        :value="null"
        label="Flaky connection"
        style="max-width: 20rem"
      />
      <Button size="sm" variant="outline" @click="runGsapFlakyProgress">Simulate</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Button, Progress } from 'vael-ui'

const gsapProgress = useTemplateRef<InstanceType<typeof Progress>>('gsapProgress')
let gsapProgressTimer: ReturnType<typeof setInterval> | undefined

function runGsapFlakyProgress() {
  const fill = gsapProgress.value?.fillEl
  if (!fill) return
  fill.style.animation = 'none'
  fill.style.transition = 'none'
  fill.style.inlineSize = '100%'
  gsap.set(fill, { scaleX: 0 }) // scaleX, not scale, scale would also squash block-size
  clearInterval(gsapProgressTimer)
  const jumps = [0.15, 0.42, 0.3, 0.68, 0.55, 0.9, 1] // includes a regression on purpose
  let tick = 0
  gsapProgressTimer = setInterval(() => {
    gsap.to(fill, { scaleX: jumps[tick], duration: 0.35, ease: 'power2.out' })
    tick++
    if (tick >= jumps.length) clearInterval(gsapProgressTimer)
  }, 220)
}
</script>

<style scoped>
.progress-row {
  align-items: center;
}
</style>
