<template>
  <section class="demo">
    <h2>OtpInput</h2>
    <p class="note">
      One real <code>&lt;input&gt;</code> stretched invisibly over the whole cell row (the
      <a href="https://github.com/guilhermerodz/input-otp" target="_blank" rel="noreferrer"
        >input-otp</a
      >
      architecture), not N separate inputs. That's what makes
      <code>autocomplete="one-time-code"</code> autofill, pasting a full code, and mid-string
      editing all work for free. Field's floating/inset label placements aren't meaningful here (no
      continuous text baseline to float over), every example below skips Field and uses a plain
      heading instead; wrap in <code>&lt;Field label-placement="top"&gt;</code> if you want a real
      label, id/aria wiring, and error text.
    </p>

    <h3>Default (6 digits) and sizes</h3>
    <OtpInput v-model="code" @complete="onComplete" />
    <p class="note">Value: {{ code || '(empty)' }}, completions: {{ completions }}</p>
    <div class="row">
      <OtpInput v-model="sizeSm" size="sm" :length="4" />
      <OtpInput v-model="sizeMd" size="md" :length="4" />
      <OtpInput v-model="sizeLg" size="lg" :length="4" />
    </div>

    <h3>Masked and alphanumeric</h3>
    <div class="row">
      <OtpInput v-model="pin" :length="4" mask />
      <OtpInput v-model="alnum" type="alphanumeric" :length="5" />
    </div>

    <h3>Invalid / disabled</h3>
    <div class="row">
      <OtpInput v-model="invalidCode" invalid :length="4" />
      <OtpInput v-model="disabledCode" disabled :length="4" />
    </div>

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

const code = shallowRef('')
const completions = shallowRef(0)
function onComplete() {
  completions.value++
}

const sizeSm = shallowRef('')
const sizeMd = shallowRef('')
const sizeLg = shallowRef('')
const pin = shallowRef('')
const alnum = shallowRef('')
const invalidCode = shallowRef('12')
const disabledCode = shallowRef('42')

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
