<template>
  <section class="demo">
    <h3>Custom loading feedback (GSAP)</h3>
    <p class="note">
      Button doesn’t run this animation; it exposes its element as <code>el</code>. After the click
      promise resolves, a GSAP tween scales that element, and <code>clearProps</code> removes the
      inline transform when it ends.
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
