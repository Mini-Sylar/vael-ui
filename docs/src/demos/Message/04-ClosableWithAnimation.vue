<template>
  <section class="demo">
    <h3>Closable, with a custom exit animation (GSAP)</h3>
    <p class="note">
      <code>beforeClose(done)</code> defers the real close until <code>done()</code> runs, letting
      an imperative library like GSAP own the exit tween instead of the built-in CSS fade. The
      dismiss button (and the exposed <code>close()</code> method) both go through this hook.
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
        v-if="showDeployMessage"
        ref="deployMessageRef"
        title="Deploy finished"
        variant="success"
        closable
        :before-close="onDeployBeforeClose"
        @open-change="() => (showDeployMessage = false)"
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

function onDeployBeforeClose(done: () => void) {
  const el = deployMessageRef.value?.el
  if (!el) {
    done()
    return
  }
  gsap.to(el, { opacity: 0, x: 24, duration: 0.2, ease: 'power3.out', onComplete: done })
}
</script>

<style scoped>
.message-stack {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}
</style>
