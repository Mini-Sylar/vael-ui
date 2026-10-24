<template>
  <div>
    <div style="height: 40px">
      <button v-if="!open" v-animate="look" class="up">Reply</button>
    </div>
    <div style="height: 40px; padding-left: 100px">
      <button v-if="open" v-animate="look" class="down">Reply</button>
    </div>
    <div :style="{ display: 'grid', gap: open ? '40px' : '0px' }">
      <div style="height: 20px">A</div>
      <div v-animate="slides" class="moves" style="height: 20px">B</div>
    </div>
    <p v-if="!open" v-animate="fades" class="goes">Goes</p>
  </div>
</template>

<script setup lang="ts" vapor>
// v-animate's layoutId in the built Vapor build.
import { shallowRef } from 'vue'
import { vAnimate } from 'vael-ui/vapor'

const open = shallowRef(false)
const look = { layoutId: 'reply', duration: 300, easing: 'linear' }
const slides = { layout: true, duration: 300, easing: 'linear' }
const fades = { initial: { opacity: 0, y: 8 } }
defineExpose({ open })
</script>
