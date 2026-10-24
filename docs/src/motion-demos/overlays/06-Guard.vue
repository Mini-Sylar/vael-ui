<template>
  <section class="demo">
    <h3>Guard</h3>
    <Button @click="open = true">Write a note</Button>
    <Dialog v-model:open="open" size="sm" title="New note" :before-close="guard">
      <Textarea v-model="note" aria-label="Note" placeholder="Start typing" :rows="4" />
      <template #footer="{ close }">
        <Button variant="secondary" @click="close()">Close</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, Textarea, confirmAction } from 'vael-ui'

const open = shallowRef(false)
const note = shallowRef('')

// Empty closes straight away; otherwise ask, and stay open on Cancel.
async function guard() {
  if (!note.value) return true
  const discard = await confirmAction({
    title: 'Discard changes?',
    description: 'Your note has not been saved.',
    confirmLabel: 'Discard',
    variant: 'danger',
  }).result
  if (discard) note.value = ''
  return discard === true
}
</script>
