<template>
  <section class="demo">
    <h2>Progress</h2>
    <p class="note">
      The fill is resized via <code>scale</code>, never <code>width</code> — the same technique the
      Tabs indicator uses (see <code>useTabIndicator.ts</code>). That's also the escape hatch:
      ignore <code>value</code> entirely and drive the exposed <code>fillEl</code> directly.
    </p>

    <h3>Determinate</h3>
    <div class="row progress-row">
      <Progress :value="uploadValue" label="Uploading" style="max-width: 20rem" />
      <Button size="sm" variant="outline" @click="startUpload">
        {{ uploadValue > 0 && uploadValue < 100 ? 'Uploading…' : 'Start upload' }}
      </Button>
    </div>

    <h3>Indeterminate — <code>value</code> unset</h3>
    <div class="row">
      <Progress :value="null" label="Working" style="max-width: 20rem" />
    </div>

    <h3>Variants</h3>
    <div class="progress-stack" style="max-width: 20rem">
      <Progress :value="70" variant="primary" />
      <Progress :value="70" variant="success" />
      <Progress :value="70" variant="warning" />
      <Progress :value="70" variant="danger" />
      <Progress :value="70" variant="info" />
    </div>

    <h3>Sizes</h3>
    <div class="progress-stack" style="max-width: 20rem">
      <Progress :value="45" size="sm" />
      <Progress :value="45" size="md" />
    </div>

    <h3>Full external control — driving <code>fillEl</code> directly</h3>
    <p class="note">
      <code>value</code> is never set here; the fill's <code>scale</code> is animated straight
      through motion-v, bypassing the built-in CSS transition entirely.
    </p>
    <div class="row progress-row">
      <Progress ref="motionProgress" :value="null" label="Custom-driven" style="max-width: 20rem" />
      <Button size="sm" variant="outline" @click="runMotionSweep">Animate</Button>
    </div>

    <h3>Extreme — GSAP, retargeted mid-tween on every tick</h3>
    <p class="note">
      A flaky, unpredictable "real" progress feed: <code>gsap.to(fillEl, ...)</code> fires every
      220ms, always before the previous 350ms tween finishes — proving GSAP's own tween-killing
      composes cleanly with the exposed ref (nothing here touches <code>value</code>, so Vue's
      <code>--ui-progress-scale</code> binding never fights it).
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
import { shallowRef, useTemplateRef } from 'vue'
import { useAnimate } from 'motion-v'
import { gsap } from 'gsap'
import { Button, Progress } from 'vael-ui'

const uploadValue = shallowRef(0)
let uploadTimer: ReturnType<typeof setInterval> | undefined

function startUpload() {
  clearInterval(uploadTimer)
  uploadValue.value = 0
  uploadTimer = setInterval(() => {
    uploadValue.value = Math.min(100, uploadValue.value + 8)
    if (uploadValue.value >= 100) clearInterval(uploadTimer)
  }, 150)
}

const motionProgress = useTemplateRef<InstanceType<typeof Progress>>('motionProgress')
const [, animate] = useAnimate()

function runMotionSweep() {
  const fill = motionProgress.value?.fillEl
  if (!fill) return
  // Disable built-in animation to avoid fighting the tween
  fill.style.animation = 'none'
  fill.style.transition = 'none'
  fill.style.inlineSize = '100%'
  animate(fill, { scale: [0, 0.3, 0.75, 1] }, { duration: 1.1, ease: [0.23, 1, 0.32, 1] })
}

const gsapProgress = useTemplateRef<InstanceType<typeof Progress>>('gsapProgress')
let gsapProgressTimer: ReturnType<typeof setInterval> | undefined

function runGsapFlakyProgress() {
  const fill = gsapProgress.value?.fillEl
  if (!fill) return
  fill.style.animation = 'none'
  fill.style.transition = 'none'
  fill.style.inlineSize = '100%'
  gsap.set(fill, { scaleX: 0 }) // scaleX, not scale — scale would also squash block-size
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
.progress-stack {
  display: grid;
  gap: 0.75rem;
}
</style>
