<template>
  <section class="demo">
    <h3>Extreme: actions spin and spring out of the trigger</h3>
    <p class="note">
      One <code>motion</code> object: each action starts small, turned and transparent, and springs
      to rest with a little overshoot, one after another (<code>stagger</code>). Closing is quicker
      and quieter, and <code>leaving: 'hold'</code> keeps the actions on their arc while they go.
    </p>
    <div class="speed-dial-stage">
      <SpeedDial
        v-model:open="open"
        aria-label="Quick actions"
        direction="quarter-circle"
        :items="items"
        :motion="actions"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SpeedDial } from 'vael-ui'
import type { SpeedDialItem, SpeedDialMotion } from 'vael-ui'
import { PhChatCircleDots, PhFilePlus, PhImage, PhLink } from '@phosphor-icons/vue'

const items: SpeedDialItem[] = [
  { label: 'New document', value: 'doc', icon: PhFilePlus },
  { label: 'Upload image', value: 'image', icon: PhImage },
  { label: 'Copy link', value: 'link', icon: PhLink },
  { label: 'Start chat', value: 'chat', icon: PhChatCircleDots },
]

const open = shallowRef(false)

const actions: SpeedDialMotion = {
  initial: { action: { opacity: 0, scale: 0.9, rotate: -90 } },
  exit: { action: { opacity: 0, scale: 0.9 } },
  spring: { damping: 0.5, response: 0.4 },
  stagger: 0.045,
  leaving: 'hold',
}
</script>

<style scoped>
.speed-dial-stage {
  display: flex;
  justify-content: center;
  padding: 8rem 1rem 1.5rem 8rem;
}
</style>
