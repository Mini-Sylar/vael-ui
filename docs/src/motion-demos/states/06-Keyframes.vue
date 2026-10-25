<template>
  <section class="demo">
    <h3>Keyframes</h3>
    <div class="row">
      <span v-animate="{ animate: ringing ? ring : rest }" class="bell" aria-hidden="true">
        <PhBell :size="28" />
      </span>
      <Button variant="secondary" @click="ringing = !ringing">
        {{ ringing ? 'Silence' : 'Ring' }}
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PhBell } from '@phosphor-icons/vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const ringing = shallowRef(false)
// A swing that settles, then a pause, over and over until it's silenced.
const ring = {
  rotate: {
    value: [0, 16, -12, 8, -4, 0, 0],
    times: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 1],
    easing: 'ease-in-out',
    duration: 1200,
    repeat: Infinity,
  },
}
const rest = { rotate: 0 }
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
