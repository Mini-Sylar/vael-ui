<template>
  <article v-animate="{ layout: true }" class="card">
    <div class="top" />
    <dl
      v-show="open"
      v-animate="{ initial: { opacity: 0, y: -6 }, exit: { opacity: 0, y: -6 } }"
      class="facts"
    />
  </article>
</template>

<script setup lang="ts" vapor>
// A card that follows its size, with details that v-show hides.
import { shallowRef } from 'vue'
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'

const open = shallowRef(true)
defineExpose({ open })
</script>

<style>
.card {
  display: grid;
  width: 200px;
}
.top {
  height: 100px;
}
.facts {
  height: 40px;
  margin: 0;
}
</style>
