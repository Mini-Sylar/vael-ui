<template>
  <section class="demo">
    <h3>Extreme: the cells shake on a wrong code (gsap)</h3>
    <p class="note">
      Enter any 4-digit code except <code>1234</code>. A GSAP timeline shakes the exposed
      <code>cellEls</code> one after another, then clears the code. The cells have no transform of
      their own, so GSAP's <code>x</code> adds to their place in the layout. The red state
      underneath comes from the <code>invalid</code> prop.
    </p>
    <OtpInput
      ref="shakeOtp"
      v-model="shakeCode"
      aria-label="Verification code"
      :length="4"
      :invalid="shakeInvalid"
      @complete="onShakeComplete"
    />
    <p class="demo-status">{{ shakeStatus }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { OtpInput } from 'vael-ui'

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const shakeOtp = useTemplateRef<InstanceType<typeof OtpInput>>('shakeOtp')
const shakeCode = shallowRef('')
const shakeInvalid = shallowRef(false)
const shakeStatus = shallowRef('Try any 4-digit code, only 1234 is correct.')

function onShakeComplete(value: string) {
  if (value === '1234') {
    shakeInvalid.value = false
    shakeStatus.value = 'Correct.'
    return
  }
  shakeInvalid.value = true
  shakeStatus.value = 'Incorrect code.'
  const cells = shakeOtp.value?.cellEls
  if (!cells || cells.length === 0 || reduce()) {
    shakeCode.value = ''
    shakeInvalid.value = false
    return
  }
  gsap
    .timeline({
      onComplete: () => {
        shakeCode.value = ''
        shakeInvalid.value = false
        shakeOtp.value?.inputEl?.focus()
      },
    })
    .to(cells, {
      x: 7,
      duration: 0.04,
      repeat: 3,
      yoyo: true,
      ease: 'power1.inOut',
      stagger: 0.025,
      clearProps: 'all',
    })
}
</script>
