<template>
  <section class="demo">
    <h3>Each repeat</h3>
    <div class="row">
      <span
        v-animate="{ animate: ringing ? ring : rest, onAfterMove: done }"
        class="bell"
        aria-hidden="true"
      >
        <PhBell :size="28" />
      </span>
      <Button variant="secondary" :disabled="ringing" @click="ringing = true">Ring</Button>
    </div>
    <p class="demo-status">{{ status }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PhBell } from '@phosphor-icons/vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import type { MotionValues } from 'vael-ui/motion'

const ringing = shallowRef(false)
const status = shallowRef('Ring the bell: it swings three times.')

const ring: MotionValues = {
  rotate: {
    value: [0, 16, -12, 8, -4, 0],
    easing: 'ease-in-out',
    duration: 700,
    repeat: 2,
    // As each repeat starts: 1, then 2.
    onRepeat: (count) => (status.value = `onRepeat: swing ${count + 1} of 3.`),
  },
}
const rest: MotionValues = { rotate: 0 }

// It has finished ringing: back to rest.
function done() {
  if (!ringing.value) return
  ringing.value = false
  status.value = 'onAfterMove: done ringing.'
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.bell {
  display: inline-flex;
  transform-origin: 50% 10%;
}
</style>
