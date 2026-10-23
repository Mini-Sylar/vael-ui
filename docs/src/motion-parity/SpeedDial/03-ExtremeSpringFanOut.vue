<template>
  <section class="demo">
    <h3>Extreme: actions spring out of the trigger</h3>
    <p class="note">
      One <code>motion</code> object: each action starts tucked into the trigger, small and
      transparent, and springs out to its place on the arc, one after another
      (<code>stagger</code>). Closing pulls them back in on a quick ease, last out first: the
      <code>exit</code> is a function of each action's place among those leaving.
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

// Snappy, a touch of bounce; one spring for place, size and fade alike.
const spring = { damping: 0.8, response: 0.156 }
const back = { duration: 130, easing: 'cubic-bezier(0, 0, 0.58, 1)' }
// `-50% -50%` is the trigger's centre, where the arc starts.
const actions: SpeedDialMotion = {
  initial: {
    action: {
      translate: { value: '-50% -50%', spring },
      scale: { value: 0.6, spring },
      opacity: { value: 0, spring },
    },
  },
  // Last out goes back first, 10ms apart.
  exit: {
    action: ({ index, count = 1 }) => {
      const leave = { ...back, delay: (count - 1 - index) * 0.01 }
      return {
        translate: { value: '-50% -50%', ...leave },
        scale: { value: 0.6, ...leave },
        opacity: { value: 0, ...leave },
      }
    },
  },
  stagger: 0.04,
}
</script>

<style scoped>
.speed-dial-stage {
  display: flex;
  justify-content: center;
  padding: 8rem 1rem 1.5rem 8rem;
}
</style>
