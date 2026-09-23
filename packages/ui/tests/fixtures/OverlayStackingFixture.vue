<template>
  <Popover v-model:open="popoverOpen" open-on-trigger-click aria-label="Test popover">
    <template #trigger>
      <button data-testid="popover-trigger">toggle popover</button>
    </template>
    <p data-testid="popover-content">popover content</p>
    <button data-testid="dialog-trigger" @click="dialogOpen = true">open dialog</button>
  </Popover>

  <Dialog v-model:open="dialogOpen" aria-label="Test dialog">
    <p data-testid="dialog-content">dialog content</p>
  </Dialog>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Popover from '../../src/components/Popover/Popover.vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'

const popoverOpen = shallowRef(false)
const dialogOpen = shallowRef(false)
</script>
