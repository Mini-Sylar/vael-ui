<template>
  <div>
    <h1 v-animate:hero="rise" class="hero">Hero</h1>
    <p v-animate:rest="{ ...rise, after: 'hero:50%' }" class="rest">Rest</p>
  </div>
</template>

<script setup lang="ts" vapor>
// A page whose elements are created before it's placed, as an out-in Transition does.
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'

const rise = { initial: { opacity: 0, y: 6 }, duration: 240 }
</script>
