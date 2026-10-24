<template>
  <section class="demo">
    <h3>Extreme: shake on a wrong code</h3>
    <p class="note">
      Enter any 4-digit code except <code>1234</code>. A wrong code sets <code>invalid</code>, and
      its keyframes shake the whole code side to side, each swing smaller than the last, while the
      cells turn red. Then the code clears.
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

// A shake that settles: each swing smaller than the last, eased between them.
const SHAKE_MS = 460
const motion: OtpInputMotion = {
  states: {
    invalid: {
      root: {
        x: { value: [0, -10, 9, -7, 5, -3, 0], duration: SHAKE_MS, easing: 'ease-in-out' },
      },
    },
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
  }, SHAKE_MS)
}
</script>
