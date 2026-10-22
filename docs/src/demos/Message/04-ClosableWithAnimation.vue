<template>
  <section class="demo">
    <h3>Closable, with a custom exit animation (GSAP)</h3>
    <p class="note">
      <code>beforeClose</code> returns a promise, and the message stays until it resolves: GSAP
      plays the exit tween, then the close goes through. The dismiss button (and the exposed
      <code>close()</code> method) both go through this hook.
    </p>
    <div class="row">
      <Button
        size="sm"
        variant="outline"
        @click="showDeployMessage = true"
        :disabled="showDeployMessage"
      >
        Trigger deploy notification
      </Button>
    </div>
    <div class="message-stack">
      <Message
        v-model:open="showDeployMessage"
        ref="deployMessageRef"
        title="Deploy finished"
        variant="success"
        closable
        :before-close="onDeployBeforeClose"
      >
        Your build finished successfully.
      </Message>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Button, Message } from 'vael-ui'

const showDeployMessage = shallowRef(false)
const deployMessageRef = useTemplateRef<InstanceType<typeof Message>>('deployMessageRef')

function onDeployBeforeClose(): Promise<boolean> {
  // Resolves true once the exit has finished, which lets the close through.
  return new Promise((resolve) => {
    const done = () => resolve(true)
    const el = deployMessageRef.value?.el
    if (!el) {
      done()
      return
    }
    gsap.to(el, { opacity: 0, x: 24, duration: 0.2, ease: 'power3.out', onComplete: done })
  })
}
</script>

<style scoped>
/* A flex column, not a grid: a grid keeps its row gap until the message is gone, a flex gap
   collapses with it. */
.message-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 28rem;
}
</style>
