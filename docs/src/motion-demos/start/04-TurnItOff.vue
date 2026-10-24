<template>
  <section class="demo">
    <h3>Turn it off</h3>
    <Switch v-model="on" label="Motion" />
    <ConfigProvider :motion="on">
      <div class="row">
        <Button @click="open = true">Open dialog</Button>
        <Select v-model="status" :items="statuses" aria-label="Status" />
        <SelectButton v-model="view" :items="views" aria-label="View" />
      </div>
      <Dialog v-model:open="open" title="Archive project" aria-label="Archive project">
        <p>You can restore it from the archive later.</p>
        <template #footer="{ close }">
          <Button @click="close()">Archive</Button>
        </template>
      </Dialog>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ConfigProvider, Dialog, Select, SelectButton, Switch } from 'vael-ui'
import type { SelectButtonItem, SelectItemData } from 'vael-ui'

const on = shallowRef(true)
const open = shallowRef(false)
const status = shallowRef<string | null>('active')
const statuses: SelectItemData[] = [
  { label: 'Active', value: 'active' },
  { label: 'On hold', value: 'hold' },
  { label: 'Archived', value: 'archived' },
]
const view = shallowRef<string | null>('list')
const views: SelectButtonItem[] = [
  { label: 'List', value: 'list' },
  { label: 'Grid', value: 'grid' },
]
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-block-start: 1rem;
}
</style>
