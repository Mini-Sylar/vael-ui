<!-- A fully custom dialog body — openDialog renders any component (typed
     props included); this one reads useDialogRef() to close itself with a
     result, same as confirmDialog's own built-in footer does internally. -->
<template>
  <input v-model="value" class="rename-input" />
  <div class="rename-actions">
    <Button variant="outline" @click="dialogRef.close()">Cancel</Button>
    <Button @click="dialogRef.close(value)">Save</Button>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, useDialogRef } from 'vael-ui'

const dialogRef = useDialogRef<void, string>()
const value = shallowRef('report.pdf')
</script>

<style scoped>
.rename-input {
  inline-size: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) - 2px);
  background: var(--ui-surface);
  color: var(--ui-text);
  font: inherit;
}

.rename-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
