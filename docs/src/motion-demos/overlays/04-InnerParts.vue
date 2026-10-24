<template>
  <section class="demo">
    <h3>Inner parts</h3>
    <Button @click="open = true">New project</Button>
    <Dialog
      v-model:open="open"
      size="sm"
      title="New project"
      description="Pick a name and a template."
      :motion="motion"
    >
      <Input v-model="name" aria-label="Project name" placeholder="Project name" />
      <template #footer="{ close }">
        <Button variant="secondary" @click="close()">Cancel</Button>
        <Button @click="close()">Create</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, Input } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const open = shallowRef(false)
const name = shallowRef('')

// Each part follows the panel a little later. On close the contents leave first.
const motion: DialogMotion = {
  initial: {
    title: { opacity: { value: 0, delay: 0.08 }, y: { value: 8, delay: 0.08 } },
    body: { opacity: { value: 0, delay: 0.14 }, y: { value: 8, delay: 0.14 } },
    footer: { opacity: { value: 0, delay: 0.2 }, y: { value: 8, delay: 0.2 } },
  },
  exitOrder: 'reverse',
}
</script>
