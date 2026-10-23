<template>
  <section class="demo">
    <h3>Extreme: shake on a wrong code</h3>
    <p class="note">
      Enter any 4-digit code except <code>1234</code>. A wrong code sets <code>invalid</code>, and
      the <code>invalid</code> state's keyframes shake the row once as it turns on. Then the code
      clears. A right code lifts the row with the <code>complete</code> state. Per-cell staggering
      isn't available: <code>OtpInput</code> only exposes <code>root</code> as a motion part.
    </p>
    <OtpInput
      ref="otp"
      v-model="code"
      aria-label="Verification code"
      :length="4"
      :invalid="invalid"
      :motion="motion"
      @complete="check"
    />
    <p class="demo-status">{{ status }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { OtpInput } from 'vael-ui'
import type { OtpInputMotion } from 'vael-ui'

const otp = useTemplateRef('otp')
const code = shallowRef('')
const invalid = shallowRef(false)
const status = shallowRef('Try any 4-digit code, only 1234 is correct.')

// Wrong: a quick side-to-side shake that dies away. Right: a small spring-loaded lift.
const motion: OtpInputMotion = {
  states: {
    invalid: { root: { x: [0, -8, 8, -5, 5, -2, 0] } },
    complete: { root: { y: { value: -3, spring: { damping: 0.5, response: 0.3 } } } },
  },
}

function check(value: string) {
  if (value === '1234') {
    invalid.value = false
    status.value = 'Correct.'
    return
  }
  invalid.value = true
  status.value = 'Incorrect code.'
  // Let the shake play, then start over.
  setTimeout(() => {
    code.value = ''
    invalid.value = false
    otp.value?.inputEl?.focus()
  }, 600)
}
</script>
