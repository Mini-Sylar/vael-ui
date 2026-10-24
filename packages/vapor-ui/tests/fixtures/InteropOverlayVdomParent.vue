<template>
  <Popover
    v-if="show && which === 'popover'"
    v-model:open="open"
    :force-mount="forceMount"
    aria-label="p"
  >
    <template #trigger><button>trigger</button></template>
    <UnmountProbe :on-gone="onGone" />
  </Popover>
  <Dialog v-if="show && which === 'dialog'" v-model:open="open" :force-mount="forceMount" title="d">
    <UnmountProbe :on-gone="onGone" />
  </Dialog>
  <Select v-if="show && which === 'select'" v-model:open="open" :items="items" aria-label="s">
    <template #header><UnmountProbe :on-gone="onGone" /></template>
  </Select>
</template>
<script setup lang="ts">
import { Dialog, Popover, Select } from 'vael-ui/vapor'
import UnmountProbe from './InteropUnmountProbe.vue'
defineProps<{ which: string; forceMount?: boolean; onGone: () => void }>()
const show = defineModel<boolean>('show', { default: true })
const open = defineModel<boolean>('open', { default: true })
const items = [{ label: 'One', value: 1 }]
</script>
