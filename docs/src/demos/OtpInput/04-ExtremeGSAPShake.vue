<template>
  <section class="demo">
    <h3>Extreme: GSAP shake-on-error (gsap)</h3>
    <p class="note">
      Enter any 4-digit code except <code>1234</code>, a GSAP stagger timeline shakes each cell in
      sequence off the exposed <code>cellEls</code> array, then clears the code. Cells lay out in
      plain flow (no transform of their own), so GSAP's <code>x</code> tween is purely additive;
      only <code>invalid</code>, a public prop, drives the library's own red state underneath.
    </p>
    <OtpInput
      ref="shakeOtp"
      v-model="shakeCode"
      :length="4"
      :invalid="shakeInvalid"
      @complete="onShakeComplete"
    />
    <p class="note">{{ shakeStatus }}</p>
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
