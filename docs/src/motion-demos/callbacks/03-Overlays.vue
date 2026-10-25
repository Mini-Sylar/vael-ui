<template>
  <section class="demo">
    <h3>After it opens and closes</h3>
    <Button @click="open = true">Rename project</Button>
    <Dialog v-model:open="open" size="sm" title="Rename project" :motion="motion">
      <Input v-model="name" aria-label="Project name" />
      <template #footer="{ close }">
        <Button @click="close()">Done</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, Input, toast } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const open = shallowRef(false)
const name = shallowRef('Atlas')

const motion: DialogMotion = {
  // Open: the name is selected, ready to type over.
  onAfterEnter: ({ panel }) => panel.querySelector('input')?.select(),
  // Closed and gone: the toast doesn't land on top of the closing dialog.
  onAfterLeave: () => toast.success(`Renamed to ${name.value}`),
}
</script>
