<template>
  <p>{{ dialogRef.data.message }}</p>
  <Checkbox
    v-model="acknowledged"
    label="I understand this can't be undone"
    style="margin-block-start: 1rem"
  />
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
import { Button, Checkbox, useDialogRef } from 'vael-ui'

const dialogRef = useDialogRef<RequiredActionData, boolean>()
const acknowledged = shallowRef(false)
</script>
