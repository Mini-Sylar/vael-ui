<template>
  <div v-animate.rise class="rise">Rise</div>
  <button v-animate="{ states: { hover: { scale: 1.1 } } }" class="hover">Hover</button>
  <ul>
    <li v-for="n in items" :key="n" v-animate="later" :class="`later-${n}`">Row {{ n }}</li>
  </ul>
</template>

<script setup lang="ts" vapor>
// v-animate's modifiers, `states` and `appear: 'later'` in a Vapor component.
import { shallowRef } from 'vue'
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'

const items = shallowRef([1, 2])
const later = { initial: { opacity: 0, y: 8 }, appear: 'later' as const }
defineExpose({ items })
</script>
