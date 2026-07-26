<template>
  <section class="demo">
    <h2>Progress</h2>
    <p class="note">
      The fill is resized via <code>scale</code>, never <code>width</code>, the same technique the
      Tabs indicator uses. That's also the escape hatch: ignore <code>value</code> entirely and
      drive the exposed <code>fillEl</code> directly.
    </p>

    <h3>Determinate, with a real numeric value</h3>
    <div class="row progress-row">
      <Progress :value="uploadValue" label="Uploading" style="max-width: 20rem" />
      <Button size="sm" variant="outline" @click="startUpload">
        {{ uploadValue > 0 && uploadValue < 100 ? 'Uploading…' : 'Start upload' }}
      </Button>
    </div>

    <h3>Indeterminate, <code>value</code> unset</h3>
    <div class="row">
      <Progress :value="null" label="Working" style="max-width: 20rem" />
    </div>

    <h3>Variants and sizes</h3>
    <div class="progress-stack" style="max-width: 20rem">
      <Progress :value="70" variant="primary" />
      <Progress :value="70" variant="success" />
      <Progress :value="70" variant="warning" />
      <Progress :value="70" variant="danger" />
      <Progress :value="45" size="sm" />
    </div>

    <h3>Custom fill animation (GSAP)</h3>
    <p class="note">
      <code>value</code> is never set here; the fill's <code>scaleX</code> is driven straight
      through <code>gsap.to(fillEl, ...)</code>, bypassing the built-in CSS transition entirely.
      Retargeting mid-tween (a flaky "real" progress feed) composes cleanly since GSAP kills the
      previous tween on the same target.
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
.progress-stack {
  display: grid;
  gap: 0.75rem;
}
</style>
