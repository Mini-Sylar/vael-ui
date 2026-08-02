<template>
  <section class="demo">
    <div class="demo-row">
      <Button variant="danger" @click="onDelete">Delete file</Button>
      <Button variant="outline" @click="onEditName">Open custom dialog</Button>
    </div>
    <p class="demo-status">
      Last result: <strong>{{ lastResult }}</strong
      ><br />
      Live queue (<code>useDialogQueue()</code>): <strong>{{ queue.length }}</strong> open
      <span v-if="queue.length > 0">— try clicking the other button while this one is open</span>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, confirmDialog, openDialog, useDialogQueue } from 'vael-ui'
import RenameFileDialogBody from './RenameFileDialogBody.vue'

// The same reactive queue <DialogHost/> renders from — every openDialog()/
// confirmDialog() call (including ones stacked on top of each other) shows
// up here for as long as it stays open.
const queue = useDialogQueue()
const lastResult = shallowRef('none yet')

async function onDelete() {
  const { result } = confirmDialog({
    title: 'Delete report.pdf?',
    description: 'This cannot be undone.',
    variant: 'danger',
    onConfirm: () => new Promise((resolve) => setTimeout(resolve, 900)), // pretend request
  })
  const confirmed = await result
  lastResult.value = confirmed === undefined ? 'dismissed' : String(confirmed)
}

async function onEditName() {
  const { result } = openDialog<void, string>(RenameFileDialogBody, { title: 'Rename file' })
  const next = await result
  lastResult.value = next === undefined ? 'dismissed' : next
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.demo-status {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
