<template>
  <Teleport to="body">
    <p class="teleported" v-animate="'rise'">b</p>
  </Teleport>
</template>

<script setup lang="ts" vapor>
// A component of the app's that teleports its content, as a modal or a toast does.
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'

void vAnimate
</script>
