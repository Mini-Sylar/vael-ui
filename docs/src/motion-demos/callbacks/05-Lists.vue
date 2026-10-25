<template>
  <section class="demo">
    <h3>Each item in a list</h3>
    <div class="anchor">
      <SpeedDial aria-label="Quick actions" direction="up" :items="items" :motion="motion" />
    </div>
    <p class="demo-status">{{ status }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SpeedDial } from 'vael-ui'
import type { SpeedDialItem, SpeedDialMotion } from 'vael-ui'
import { PhFilePlus, PhImage, PhLink } from '@phosphor-icons/vue'

const items: SpeedDialItem[] = [
  { label: 'New file', icon: PhFilePlus },
  { label: 'Add image', icon: PhImage },
  { label: 'Copy link', icon: PhLink },
]
const status = shallowRef('Open the menu.')

const motion: SpeedDialMotion = {
  // Per item, with its place among those that came in together.
  onAfterEnter: (_, { index }) => (status.value = `onAfterEnter: action ${index + 1} is out.`),
  onAfterLeave: (_, { index }) => (status.value = `onAfterLeave: action ${index + 1} is away.`),
}
</script>

<style scoped>
.anchor {
  display: flex;
  justify-content: center;
  padding-top: 11rem;
}
</style>
