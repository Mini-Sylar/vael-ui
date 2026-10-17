<template>
  <Dialog v-model:open="open" title="Edit">
    <button ref="inner" data-testid="inner">Save</button>
    <Tooltip :trigger-el="innerRef" :open-delay="120" :close-delay="40">
      <span data-testid="tip-inner">Saves the draft</span>
    </Tooltip>
  </Dialog>
  <output data-testid="dialog-open">{{ open }}</output>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'
import Tooltip from '../../src/components/Tooltip/Tooltip.vue'

const open = shallowRef(true)
const innerRef = useTemplateRef('inner')
</script>
