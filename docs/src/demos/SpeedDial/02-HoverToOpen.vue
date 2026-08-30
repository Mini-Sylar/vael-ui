<template>
  <section class="demo">
    <h3>Hover to open: <code>open-on="hover"</code></h3>
    <p class="note">
      Additive on top of click, and only on a real hover-capable pointer, Tab + Enter still opens it
      with the mouse nowhere near.
    </p>
    <div class="speed-dial-row">
      <div class="speed-dial-anchor">
        <SpeedDial
          aria-label="Hover actions"
          direction="up"
          open-on="hover"
          :items="items"
          @select="onSelect"
        />
      </div>
    </div>
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
  gap: 3rem;
  /* Generous block-start clearance specifically, the "up" and
     "quarter-circle" directions fan out ABOVE the trigger, and without
     room to do it in, the actions overlap whatever content precedes this
     row instead of the empty page background. */
  padding: 8rem 1rem 2rem;
}
/* SpeedDial's own actions are position:absolute against its root, each
   instance needs a positioned, appropriately-sized box of its own so
   neighboring dials (and the rest of the page) don't get walked over. */
.speed-dial-anchor {
  position: relative;
  inline-size: 3.5rem;
  block-size: 3.5rem;
}
</style>
