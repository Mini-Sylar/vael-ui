<template>
  <p>{{ dialogRef.data.message }}</p>
  <label class="row" style="margin-block-start: 1rem; gap: 0.5rem">
    <input v-model="acknowledged" type="checkbox" />
    I understand this can't be undone
  </label>
  <div class="row" style="margin-block-start: 1rem">
    <Button :disabled="!acknowledged" @click="dialogRef.close(true)">Continue</Button>
  </div>
</template>

<script lang="ts">
export interface RequiredActionData {
  message: string
}
</script>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, useDialogRef } from 'vael-ui'

const dialogRef = useDialogRef<RequiredActionData, boolean>()
const acknowledged = shallowRef(false)
</script>
