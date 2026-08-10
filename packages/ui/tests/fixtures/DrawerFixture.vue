<template>
  <button data-testid="outside" @click="outsideClicks++">Outside content</button>
  <output data-testid="outside-clicks">{{ outsideClicks }}</output>

  <button data-testid="trigger-modal" @click="modalOpen = true">Open modal drawer</button>
  <output data-testid="modal-state">{{ modalOpen ? 'open' : 'closed' }}</output>
  <Dialog v-model:open="modalOpen" :position="position" aria-label="Modal drawer">
    <template #default="{ close }">
      <input data-testid="first" aria-label="First field" />
      <input data-testid="second" aria-label="Second field" />
      <button data-testid="done" @click="close()">Done</button>
    </template>
  </Dialog>

  <button data-testid="trigger-pinned" @click="pinnedOpen = true">Open pinned drawer</button>
  <output data-testid="pinned-state">{{ pinnedOpen ? 'open' : 'closed' }}</output>
  <Dialog v-model:open="pinnedOpen" :position="position" :modal="false" aria-label="Pinned drawer">
    <template #default>
      <p>Pinned content</p>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'
import type { DialogPosition } from '../../src/components/Dialog/Dialog.vue'

withDefaults(defineProps<{ position?: DialogPosition }>(), { position: 'right' })

const modalOpen = shallowRef(false)
const pinnedOpen = shallowRef(false)
const outsideClicks = shallowRef(0)
</script>
