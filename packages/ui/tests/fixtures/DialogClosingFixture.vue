<template>
  <button data-testid="trigger" @click="open = true">open</button>
  <Dialog v-model:open="open" aria-label="Closing dialog" :before-close="beforeClose">
    <template #default="{ isClosing, cancelClose }">
      <p data-testid="content">content</p>
      <output data-testid="closing-state">{{ isClosing ? 'closing' : 'open' }}</output>
      <button data-testid="cancel-close" @click="cancelClose()">cancel close</button>
    </template>
  </Dialog>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Dialog from '../../src/components/Dialog.vue'

defineProps<{ beforeClose?: (done: () => void) => void }>()

const open = shallowRef(false)
</script>
