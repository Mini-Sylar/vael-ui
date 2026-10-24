<template>
  <section class="demo">
    <h3>Closable, with a custom exit animation (GSAP)</h3>
    <p class="note">
      A <code>leave</code> hook in <code>motion</code> animates the message out with GSAP, and
      Message closes the space it took once the tween ends. The close button and the exposed
      <code>close()</code> both play it.
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
        title="Deploy finished"
        variant="success"
        closable
        :motion="slideAway"
      >
        Your build finished successfully.
      </Message>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { gsap } from 'gsap'
import { Button, Message } from 'vael-ui'
import type { MessageMotion } from 'vael-ui'

const showDeployMessage = shallowRef(false)

const slideAway: MessageMotion = {
  leave: ({ root }) => gsap.to(root, { opacity: 0, x: 24, duration: 0.2, ease: 'power3.out' }),
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
