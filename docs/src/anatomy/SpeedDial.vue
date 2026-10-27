<!-- SpeedDial with every part: the trigger, open on its actions. -->
<template>
  <div data-specimen class="specimen">
    <SpeedDial :open="true" aria-label="Quick actions" :items="items" />
  </div>
</template>

<script setup lang="ts">
import { SpeedDial } from 'vael-ui'
import type { SpeedDialItem } from 'vael-ui'
import { PhChatCircleDots, PhFilePlus, PhLink } from '@phosphor-icons/vue'

const items: SpeedDialItem[] = [
  { label: 'New document', value: 'doc', icon: PhFilePlus },
  { label: 'Copy link', value: 'link', icon: PhLink },
  { label: 'Start chat', value: 'chat', icon: PhChatCircleDots },
]
</script>

<style scoped>
/* Room above the trigger for the actions it fans out. */
.specimen {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  inline-size: min(18rem, 100%);
  block-size: 15rem;
}
</style>
