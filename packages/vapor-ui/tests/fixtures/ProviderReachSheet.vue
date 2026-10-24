<template>
  <Teleport to="body">
    <p class="teleported" v-animate="'rise'">b</p>
  </Teleport>
</template>

<script setup lang="ts" vapor>
// A component of the app's that teleports its content, as a modal or a toast does.
import { vAnimate } from 'vael-ui/vapor'

void vAnimate
</script>
