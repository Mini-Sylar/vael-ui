<template>
  <section class="demo">
    <h3>Custom loading feedback (GSAP)</h3>
    <p class="note">
      Button owns none of this animation, it only exposes the underlying element through
      <code>defineExpose</code>. This example runs a GSAP tween on that ref after the click promise
      resolves, then hands the transform back to the stylesheet with <code>clearProps</code> so the
      button's normal CSS press feedback keeps working afterward.
    </p>
    <div class="row">
      <Button ref="gsapBtn" loading="auto" @click="gsapSave">Publish</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Button } from 'vael-ui'

const gsapBtn = useTemplateRef('gsapBtn')

const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 1400))

async function gsapSave() {
  await fakeSave()
  gsap.fromTo(
    gsapBtn.value!.el,
    { scale: 1.05 },
    { scale: 1, duration: 0.4, ease: 'back.out(3)', clearProps: 'transform' },
  )
}
</script>
