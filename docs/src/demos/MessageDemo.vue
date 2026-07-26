<template>
  <section class="demo">
    <h2>Message</h2>
    <p class="note">
      In-flow and stationary, not a floating layer, a crisp <code>border</code>, no
      <code>box-shadow</code>, same convention as Card. The per-variant icons come from
      <code>StatusIcon</code>, extracted out of Toaster so Toast and Message share the same visual
      vocabulary without sharing any of Toast's queue/stacking machinery.
    </p>

    <h3>Status variants</h3>
    <div class="message-stack">
      <Message title="Heads up" variant="default">
        A plain informational message. <code>role="status"</code> by default.
      </Message>
      <Message title="Saved" variant="success">Your changes were saved successfully.</Message>
      <Message title="Something went wrong" variant="error">
        The request failed. <code>role="alert"</code> by default.
      </Message>
      <Message title="Storage almost full" variant="warning">
        You're at 92% of your plan's storage. <code>role="alert"</code> by default.
      </Message>
      <Message title="New feature" variant="info">Custom domains are now available.</Message>
    </div>

    <h3>Custom <code>#icon</code> slot (Phosphor)</h3>
    <p class="note">
      The <code>#icon</code> slot overrides the automatic <code>StatusIcon</code> per instance, pass
      any icon set you like, including Phosphor.
    </p>
    <div class="message-stack">
      <Message title="Automatic icon" variant="success">
        No <code>#icon</code> given, so the variant's own <code>StatusIcon</code> renders.
      </Message>
      <Message title="Starred repository" variant="default">
        <template #icon>
          <PhStar weight="fill" />
        </template>
        Custom <code>#icon</code> slot, here a filled Phosphor star instead of the default glyph.
      </Message>
    </div>

    <h3>Inline appearance for form validation</h3>
    <p class="note">
      <code>appearance="bare"</code> drops the border/background/padding, icon plus colored text
      only, sized for sitting directly under a field instead of standing alone as a banner.
    </p>
    <div class="field">
      <label class="field-label" for="email-field">Email</label>
      <Input
        id="email-field"
        v-model="email"
        :invalid="!emailValid"
        placeholder="you@company.com"
      />
      <Message v-if="!emailValid" variant="error" appearance="bare">
        Enter a valid email address.
      </Message>
    </div>

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
import { computed, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Button, Input, Message } from 'vael-ui'
import { PhStar } from '@phosphor-icons/vue'

const email = shallowRef('not-an-email')
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))

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

.field {
  display: grid;
  gap: 0.375rem;
  max-width: 20rem;
  margin-block-end: 0.75rem;
}
.field-label {
  font-size: 0.8125rem;
  font-weight: 500;
}
</style>
