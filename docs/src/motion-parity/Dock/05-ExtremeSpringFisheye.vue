<template>
  <section class="demo">
    <h3>Extreme: a spring fisheye</h3>
    <p class="note">
      Dock's own magnification follows the pointer on the <code>spring</code> in its
      <code>motion</code>, so each icon swells up out of the bar, pushes its neighbors aside and
      overshoots, and the bar widens with them. Picking an app launches it with a double hop:
      <code>states.selected</code> plays it on that <code>item</code>, keyframes placed with
      <code>times</code>, each fall on the <code>'bounce'</code> easing.
    </p>
    <div class="stage">
      <Dock
        aria-label="Applications"
        :items="appItems"
        :max-size="86"
        :motion="motion"
        @select="launched = $event.label"
      />
    </div>
    <p class="demo-status">
      Last launched: <strong>{{ launched ?? 'none yet' }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dock } from 'vael-ui'
import type { DockItemData, DockMotion } from 'vael-ui'
import {
  PhBrowser,
  PhCalendar,
  PhChatCircleDots,
  PhEnvelopeSimple,
  PhGear,
  PhMusicNotes,
  PhNotePencil,
} from '@phosphor-icons/vue'

const appItems: DockItemData[] = [
  { label: 'Finder', value: 'finder', icon: PhBrowser },
  { label: 'Mail', value: 'mail', icon: PhEnvelopeSimple, badge: 3 },
  { label: 'Messages', value: 'messages', icon: PhChatCircleDots },
  { label: 'Notes', value: 'notes', icon: PhNotePencil },
  { label: 'Calendar', value: 'calendar', icon: PhCalendar },
  { label: 'Music', value: 'music', icon: PhMusicNotes },
  { label: 'Settings', value: 'settings', icon: PhGear },
]
const launched = shallowRef<string | null>(null)

const motion: DockMotion = {
  // Fitted to the original's spring (stiffness 420, damping 28, stepped once a frame).
  spring: { damping: 0.77, response: 0.27 },
  states: {
    // Two hops, the second lower: each rises and lands with a bounce.
    selected: {
      item: {
        y: {
          value: [0, -30, 0, -14, 0],
          times: [0, 0.23, 0.52, 0.71, 1],
          easing: ['out', 'bounce', 'out', 'bounce'],
          duration: 1040,
        },
      },
    },
  },
}
</script>

<style scoped>
.stage {
  display: flex;
  justify-content: center;
  padding-block: 2.5rem 0.5rem;
}
</style>
