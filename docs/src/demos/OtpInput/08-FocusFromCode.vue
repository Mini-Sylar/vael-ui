<template>
  <section class="demo">
    <h3>Focus it from your code</h3>
    <p class="note">
      <code>focus()</code> is exposed. Called while the field is disabled, it focuses the field once
      it's enabled again. Enter a wrong code, <code>123456</code> is right: while it's checked the
      field is disabled, and focus comes back to it when the check ends.
    </p>
    <Field label="Verification code" :error="wrong ? 'That code is not right' : undefined">
      <OtpInput ref="otp" v-model="code" :disabled="checking" :invalid="wrong" @complete="check" />
    </Field>
    <p v-if="verified" class="status" role="status">Verified.</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Field, OtpInput } from 'vael-ui'

const otp = useTemplateRef('otp')
const code = shallowRef('')
const checking = shallowRef(false)
const wrong = shallowRef(false)
const verified = shallowRef(false)

async function check(value: string) {
  checking.value = true
  wrong.value = false
  await new Promise((resolve) => setTimeout(resolve, 900)) // your API call
  checking.value = false
  if (value === '123456') {
    verified.value = true
    return
  }
  wrong.value = true
  code.value = ''
  otp.value?.focus()
}
</script>

<style scoped>
.status {
  margin: 0.75rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
