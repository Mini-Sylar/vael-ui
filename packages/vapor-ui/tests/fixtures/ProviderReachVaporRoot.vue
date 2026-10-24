<template>
  <ConfigProvider :motion="{ version: 1, presets: { rise } }">
    <ProviderReachSheet />
  </ConfigProvider>
  <ConfigProvider :motion="false">
    <p class="off" v-animate="{ initial: { opacity: 0, y: 12 }, duration: 1500 }">x</p>
  </ConfigProvider>
</template>

<script setup lang="ts" vapor>
// Built `vael-ui/vapor`: a preset inside a teleporting component, and v-animate under motion: false.
import { ConfigProvider, vAnimate } from 'vael-ui/vapor'
import ProviderReachSheet from './ProviderReachSheet.vue'

const rise = { initial: { opacity: 0, y: 12 }, duration: 1500 }
void vAnimate
</script>
