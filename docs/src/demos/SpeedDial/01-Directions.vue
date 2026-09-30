<template>
  <section class="demo speed-dial-demo">
    <h3>Directions: <code>direction="up" | "left" | "quarter-circle"</code></h3>
    <p class="note">
      A staggered fan-out (40ms per action), each one visibly emerging from the trigger.
    </p>
    <div class="speed-dial-row">
      <div class="speed-dial-anchor">
        <SpeedDial aria-label="Quick actions" direction="up" :items="items" @select="onSelect" />
      </div>
      <div class="speed-dial-anchor">
        <SpeedDial aria-label="Quick actions" direction="left" :items="items" @select="onSelect" />
      </div>
      <div class="speed-dial-anchor">
        <SpeedDial
          aria-label="Quick actions"
          direction="quarter-circle"
          :items="items"
          @select="onSelect"
        />
      </div>
    </div>
    <p class="demo-status">
      Last action: <strong>{{ lastSelected ?? 'none yet' }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SpeedDial } from 'vael-ui'
import type { SpeedDialItem } from 'vael-ui'
import { PhChatCircleDots, PhFilePlus, PhImage, PhLink } from '@phosphor-icons/vue'

const lastSelected = shallowRef<string | null>(null)
function onSelect(item: SpeedDialItem) {
  lastSelected.value = item.label
}

const items: SpeedDialItem[] = [
  { label: 'New document', value: 'doc', icon: PhFilePlus },
  { label: 'Upload image', value: 'image', icon: PhImage },
  { label: 'Copy link', value: 'link', icon: PhLink },
  { label: 'Start chat', value: 'chat', icon: PhChatCircleDots },
]
</script>

<style scoped>
.speed-dial-row {
  display: flex;
  align-items: center;
  gap: 12rem;
  justify-content: center;
  padding: 12rem 1rem 2rem;
}
/* Too narrow for three dials side by side: stack them at the inline end so
   the leftward fans still have room. */
.speed-dial-demo {
  container-type: inline-size;
}
@container (max-width: 37rem) {
  .speed-dial-row {
    flex-direction: column;
    align-items: flex-end;
    gap: 8rem;
    padding-block-start: 12rem;
  }
}
/* SpeedDial's own actions are position:absolute against its root, each
   instance needs a positioned, appropriately-sized box of its own so
   neighboring dials (and the rest of the page) don't get walked over. */
.speed-dial-anchor {
  position: relative;
  flex-shrink: 0;
  inline-size: 3.5rem;
  block-size: 3.5rem;
}
</style>
