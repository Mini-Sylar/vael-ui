<template>
  <button data-testid="trigger" @click="open = true">Open</button>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="closing-state">{{ msg?.isClosing ? 'closing' : 'open' }}</output>

  <Message
    ref="msg"
    v-model:open="open"
    title="Saved"
    variant="success"
    closable
    force-mount
    :before-close="beforeClose"
    @open-change="onOpenChange"
  >
    Your changes have been saved.
  </Message>

  <button data-testid="cancel-close" @click="msg?.cancelClose()">Cancel close</button>
  <button data-testid="programmatic-close" @click="msg?.close()">Close</button>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Message from '../../src/components/Message.vue'
import type { MessageOpenChangeDetails } from '../../src/components/Message.vue'

const props = defineProps<{
  beforeClose?: (done: () => void) => void
  veto?: boolean
}>()

const open = shallowRef(false)
const msg = useTemplateRef('msg')

function onOpenChange(_value: boolean, details: MessageOpenChangeDetails) {
  if (props.veto) details.cancel()
}
</script>
