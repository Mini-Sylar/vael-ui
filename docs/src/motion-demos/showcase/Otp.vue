<!-- A verification code field: the ring glides between cells, a wrong code shakes, the right one draws a tick. -->
<template>
  <section class="demo">
    <h3>Verification code</h3>
    <OtpInput
      v-model="code"
      :groups="3"
      :invalid="state === 'wrong'"
      :disabled="state === 'ok'"
      :motion="motion"
      aria-label="Verification code"
      @complete="check"
    />
    <p class="status" :data-state="state" aria-live="polite">
      <!-- replay: the line plays its entrance again on each change. -->
      <span v-animate="{ ...status, replay: state }" class="line">
        <svg v-if="state === 'ok'" viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
          <path v-animate="tick" d="M60 132l44 44 92-92" pathLength="1" />
        </svg>
        <Loader v-else-if="state === 'checking'" size="sm" />
        {{ text[state] }}
      </span>
      <Button v-if="state === 'ok'" size="sm" variant="ghost" @click="reset">Again</Button>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Button, Loader, OtpInput, vAnimate } from 'vael-ui'
import type { OtpInputMotion } from 'vael-ui'

const code = shallowRef('')
const state = shallowRef<'idle' | 'checking' | 'wrong' | 'ok'>('idle')
const text = {
  idle: 'Enter the code we sent you (424242).',
  checking: 'Checking…',
  wrong: 'That code didn’t work.',
  ok: 'Verified',
}
function check(value: string) {
  state.value = 'checking'
  setTimeout(() => (state.value = value === '424242' ? 'ok' : 'wrong'), 700)
}
// Editing a wrong code clears the error, so the next one shakes again.
watch(code, (now) => state.value === 'wrong' && now.length < 6 && (state.value = 'idle'))
function reset() {
  code.value = ''
  state.value = 'idle'
}
const ease = 'cubic-bezier(0.23, 1, 0.32, 1)'
const motion: OtpInputMotion = {
  states: { invalid: { root: { x: [0, -8, 8, -6, 6, 0] } } },
  duration: 400,
}
const status = { initial: { opacity: 0, y: 4, blur: 2 }, duration: 150, easing: ease }
const tick = { initial: { strokeDashoffset: 1 }, delay: 0.08, duration: 300, easing: ease }
</script>

<style scoped>
.demo {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.75rem;
  min-block-size: 10rem;
}
.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-block-size: 2rem;
  margin: 0;
  color: var(--ui-text-muted);
}
.status[data-state='wrong'] {
  color: var(--ui-danger);
}
.status[data-state='ok'] {
  color: var(--ui-success);
}
.line {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}
.line path {
  fill: none;
  stroke: var(--ui-success);
  stroke-width: 24;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
}
</style>
