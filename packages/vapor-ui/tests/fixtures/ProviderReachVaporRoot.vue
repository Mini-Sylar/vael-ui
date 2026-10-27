<template>
  <ConfigProvider :motion="{ version: 1, presets: { rise } }">
    <ProviderReachSheet />
    <Teleport to="body">
      <p class="beside" v-animate="'rise'">c</p>
    </Teleport>
  </ConfigProvider>
  <ConfigProvider :motion="false">
    <p class="off" v-animate="{ initial: { opacity: 0, y: 12 }, duration: 1500 }">x</p>
    <Teleport to="body">
      <p class="off-beside" v-animate="{ initial: { opacity: 0, y: 12 }, duration: 1500 }">y</p>
    </Teleport>
  </ConfigProvider>
</template>

<script setup lang="ts" vapor>
// Built `vael-ui/vapor`: a preset inside a teleporting component, and v-animate under motion: false.
import { ConfigProvider } from 'vael-ui/vapor'
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'
import ProviderReachSheet from './ProviderReachSheet.vue'

const rise = { initial: { opacity: 0, y: 12 }, duration: 1500 }
void vAnimate
</script>
