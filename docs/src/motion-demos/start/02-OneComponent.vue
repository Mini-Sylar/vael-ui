<template>
  <section class="demo">
    <h3>One component</h3>
    <div class="row">
      <SelectButton v-model="mode" :items="modes" aria-label="Motion" />
      <Button @click="open = true">Open dialog</Button>
    </div>
    <Dialog
      v-model:open="open"
      title="Invite a teammate"
      aria-label="Invite a teammate"
      :motion="mode === 'yours' ? yours : true"
    >
      <p>They get an email with a link to join the project.</p>
      <template #footer="{ close }">
        <Button @click="close()">Send invite</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, SelectButton } from 'vael-ui'
import type { DialogMotion, SelectButtonItem } from 'vael-ui'

const open = shallowRef(false)
const mode = shallowRef<string | null>('built-in')
const modes: SelectButtonItem[] = [
  { label: 'Built-in', value: 'built-in' },
  { label: 'Yours', value: 'yours' },
]

// Rises from below and overshoots a little on arrival.
const yours: DialogMotion = {
  initial: { panel: { opacity: 0, y: 32, scale: '0.94' } },
  spring: { damping: 0.7, response: 0.45 },
}
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
</style>
