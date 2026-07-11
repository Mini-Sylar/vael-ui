<template>
  <button data-testid="trigger" @click="open = true">Open dialog</button>
  <output data-testid="state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="last-reason">{{ lastReason }}</output>

  <Dialog v-model:open="open" aria-label="Example dialog" @open-change="onOpenChange">
    <template #default="{ close }">
      <h2>Settings</h2>
      <input data-testid="first" aria-label="First field" />
      <input data-testid="second" aria-label="Second field" />
      <button data-testid="done" @click="close()">Done</button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Dialog from '../../src/components/Dialog.vue'
import type { DialogOpenChangeDetails } from '../../src/composables/useDialog'

const props = defineProps<{ veto?: boolean }>()

const open = shallowRef(false)
const lastReason = shallowRef('')

function onOpenChange(_value: boolean, details: DialogOpenChangeDetails) {
  lastReason.value = details.reason
  if (props.veto) details.cancel()
}
</script>
