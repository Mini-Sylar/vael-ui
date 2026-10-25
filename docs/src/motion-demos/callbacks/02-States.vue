<template>
  <section class="demo">
    <h3>After a state</h3>
    <OtpInput
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
import { shallowRef } from 'vue'
import { OtpInput } from 'vael-ui'
import type { OtpInputMotion } from 'vael-ui'

const code = shallowRef('')
const invalid = shallowRef(false)
const status = shallowRef('Any code but 1234 is wrong.')

const motion: OtpInputMotion = {
  states: {
    invalid: {
      root: { x: { value: [0, -8, 8, -5, 5, 0], duration: 400 } },
      // The shake has played: start over, back in the first cell.
      onAfterEnter: ({ root }) => {
        code.value = ''
        invalid.value = false
        root.querySelector('input')?.focus()
      },
      onAfterLeave: () => (status.value = 'onAfterLeave: cleared. Try again.'),
    },
  },
}

function check(value: string) {
  invalid.value = value !== '1234'
  status.value = invalid.value ? 'Wrong code.' : 'Correct.'
}
</script>
