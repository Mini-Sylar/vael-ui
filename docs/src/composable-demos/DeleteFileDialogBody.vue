<!-- The low-level way to build a confirm-shaped dialog by hand — contrast
     with confirmAction(), which does exactly this for you. -->
<template>
  <p class="delete-description">This cannot be undone.</p>
  <div class="delete-actions">
    <Button variant="outline" @click="dialogRef.close(false)">Cancel</Button>
    <Button variant="danger" @click="onConfirm">Delete</Button>
  </div>
</template>

<script setup lang="ts">
import { Button, useDialogRef } from 'vael-ui'

const dialogRef = useDialogRef<void, boolean>()

async function onConfirm() {
  await new Promise((resolve) => setTimeout(resolve, 900)) // pretend request
  dialogRef.close(true)
}
</script>

<style scoped>
.delete-description {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  margin: 0;
}

.delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
