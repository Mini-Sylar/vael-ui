<template>
  <button data-testid="trigger" @click="open = true">Open</button>
  <output data-testid="state">{{ open ? 'open' : 'closed' }}</output>

  <Dialog
    v-model:open="open"
    title="Delete workspace"
    description="This action cannot be undone."
    size="sm"
  >
    <template #default>
      <p>Body content.</p>
    </template>
    <template #footer="{ close }">
      <Button variant="ghost" data-testid="cancel" @click="close()">Cancel</Button>
      <Button variant="danger" data-testid="confirm">Delete</Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'
import Button from '../../src/components/Button/Button.vue'

const open = shallowRef(false)
</script>
