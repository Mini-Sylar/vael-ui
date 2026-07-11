<template>
  <p>{{ dialogRef.data.message }}</p>
  <div class="row" style="margin-block-start: 1rem">
    <Button
      v-if="dialogRef.data.dangerFirst"
      variant="danger"
      data-role="confirm"
      @click="dialogRef.close(true)"
      >Delete</Button
    >
    <Button variant="ghost" data-role="cancel" @click="dialogRef.close(false)">Cancel</Button>
    <Button
      v-if="!dialogRef.data.dangerFirst"
      variant="danger"
      data-role="confirm"
      @click="dialogRef.close(true)"
      >Delete</Button
    >
  </div>
</template>

<script lang="ts">
export interface ConfirmDialogData {
  message: string
  /** Puts Delete before Cancel to demo initialFocus override */
  dangerFirst?: boolean
}
</script>

<script setup lang="ts">
import { Button, useDialogRef } from 'vael-ui'

// Loaded via openDialog(); DialogHost renders this inside a Dialog
const dialogRef = useDialogRef<ConfirmDialogData, boolean>()
</script>
