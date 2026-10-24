<template>
  <section class="demo">
    <h3>It already moves</h3>
    <div class="row">
      <Button @click="open = true">Rename project</Button>
      <Select v-model="status" :items="statuses" aria-label="Status" />
      <Switch v-model="notify" label="Notify me" />
      <Button variant="outline" @click="toast.success('Project saved')">Save</Button>
    </div>
    <Dialog v-model:open="open" title="Rename project" aria-label="Rename project">
      <p>Everyone in the workspace sees the new name.</p>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Cancel</Button>
        <Button @click="close()">Rename</Button>
      </template>
    </Dialog>
    <Toaster />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, Select, Switch, Toaster, toast } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

const open = shallowRef(false)
const notify = shallowRef(true)
const status = shallowRef<string | null>('active')
const statuses: SelectItemData[] = [
  { label: 'Active', value: 'active' },
  { label: 'On hold', value: 'hold' },
  { label: 'Archived', value: 'archived' },
]
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
</style>
