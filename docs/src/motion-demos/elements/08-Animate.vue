<template>
  <section class="demo">
    <h3>Hold a look</h3>
    <div class="row">
      <span
        v-animate="{
          animate: { scale: status === 'live' ? 1.25 : 1, backgroundColor: colours[status] },
          spring: { damping: 0.55, response: 0.4 },
        }"
        class="dot"
        aria-hidden="true"
      />
      <SelectButton
        v-model="status"
        :items="[
          { label: 'Offline', value: 'offline' },
          { label: 'Away', value: 'away' },
          { label: 'Live', value: 'live' },
        ]"
        size="sm"
        aria-label="Status"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { SelectButton, vAnimate } from 'vael-ui'

const status = shallowRef<'offline' | 'away' | 'live'>('offline')
const colours = {
  offline: 'rgb(161, 161, 170)',
  away: 'rgb(234, 179, 8)',
  live: 'rgb(34, 197, 94)',
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.dot {
  inline-size: 0.875rem;
  block-size: 0.875rem;
  border-radius: 999px;
}
</style>
