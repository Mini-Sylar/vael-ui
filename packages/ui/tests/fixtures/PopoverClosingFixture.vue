<template>
  <button ref="triggerRef" data-testid="trigger" @click="open = !open">toggle</button>
  <button data-testid="cancel-close" @click="popover?.cancelClose()">cancel close</button>
  <Popover ref="popover" v-model:open="open" :trigger-el="triggerRef" :before-close="beforeClose">
    <template #default="{ isClosing }">
      <p data-testid="content">content</p>
      <output data-testid="closing-state">{{ isClosing ? 'closing' : 'open' }}</output>
    </template>
  </Popover>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Popover from '../../src/components/Popover.vue'

defineProps<{ beforeClose?: (done: () => void) => void }>()

const open = shallowRef(false)
const triggerRef = useTemplateRef('triggerRef')
const popover = useTemplateRef('popover')
</script>
