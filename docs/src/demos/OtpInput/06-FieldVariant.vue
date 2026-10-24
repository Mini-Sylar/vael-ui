<template>
  <section class="demo">
    <h3>One field, like a phone's verification screen</h3>
    <p class="note">
      <code>variant="field"</code> draws one box around the code, and
      <code>placeholder="0"</code> marks each empty cell. The box shows the focus, the invalid state
      and the caret.
    </p>
    <div class="otp-stack">
      <OtpInput v-model="code" variant="field" placeholder="0" aria-label="Verification code" />
      <OtpInput
        v-model="code"
        variant="field"
        placeholder="•"
        size="lg"
        aria-label="Verification code"
      />
      <OtpInput
        v-model="code"
        variant="field"
        placeholder="0"
        :groups="3"
        aria-label="Verification code"
      />
    </div>
    <p class="demo-status">Code: {{ code || '(empty)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { OtpInput } from 'vael-ui'

const code = shallowRef('')
</script>

<style scoped>
.otp-stack {
  display: grid;
  gap: 1rem;
  justify-items: start;
}
</style>
