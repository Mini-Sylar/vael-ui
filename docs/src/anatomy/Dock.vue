<!-- Dock with every part: the bar and its items, one with a badge. -->
<template>
  <div data-specimen class="specimen">
    <Dock aria-label="Apps" :items="items" />
  </div>
</template>

<script setup lang="ts">
import { Dock } from 'vael-ui'
import type { DockItemData } from 'vael-ui'
import { PhCalendar, PhChatCircleDots, PhEnvelopeSimple, PhGear } from '@phosphor-icons/vue'

const items: DockItemData[] = [
  { label: 'Mail', icon: PhEnvelopeSimple, badge: 3 },
  { label: 'Calendar', icon: PhCalendar },
  { label: 'Messages', icon: PhChatCircleDots },
  { label: 'Settings', icon: PhGear },
]
</script>

<style scoped>
.specimen {
  display: flex;
  justify-content: center;
  inline-size: min(20rem, 100%);
}
</style>
