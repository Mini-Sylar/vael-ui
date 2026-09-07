<template>
  <section class="demo">
    <h3>Badge in a fixed layout: reserve the wrapper with <code>badgePlacement</code></h3>
    <p class="note">
      A <code>#badge</code> slot that's <code>v-if</code>'d on real data (an unread count) would
      otherwise flip the button between "plain element" and "wrapped in a span" the moment the first
      badge appears — enough to knock a grid- or nth-child-placed button out of position. Setting
      <code>badgePlacement</code> reserves the wrapper up front, and the button's own
      <code>ui.root</code> class rides onto that wrapper, so its cell never moves.
    </p>
    <div class="pill">
      <Button
        v-for="tab in tabs"
        :key="tab.id"
        variant="ghost"
        badge-placement="top-end"
        :ui="{ root: { class: `pill-item pill-${tab.id}` } }"
        :aria-label="tab.label"
      >
        <template v-if="tab.id === 'inbox' && unread > 0" #badge>
          <Badge variant="danger" :count="unread" />
        </template>
        <component :is="tab.icon" weight="bold" />
      </Button>
    </div>
    <div class="row">
      <Button size="sm" variant="ghost" @click="unread++">+1 unread</Button>
      <Button size="sm" variant="ghost" :disabled="unread === 0" @click="unread = 0">clear</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Badge, Button } from 'vael-ui'
import { PhHouse, PhTray, PhBell, PhGear } from '@phosphor-icons/vue'

const unread = shallowRef(0)
const tabs = [
  { id: 'home', label: 'Home', icon: PhHouse },
  { id: 'inbox', label: 'Inbox', icon: PhTray },
  { id: 'activity', label: 'Activity', icon: PhBell },
  { id: 'settings', label: 'Settings', icon: PhGear },
]
</script>

<style scoped>
.pill {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  inline-size: fit-content;
  margin-block-end: 1rem;
}
.pill-item {
  justify-self: center;
}
/* Explicit cell placement — this is what silently broke when the wrapper
   appeared and the button stopped being the grid's direct child. */
.pill-home {
  grid-column: 1;
}
.pill-inbox {
  grid-column: 2;
}
.pill-activity {
  grid-column: 3;
}
.pill-settings {
  grid-column: 4;
}
.row {
  display: flex;
  gap: 0.5rem;
}
</style>
