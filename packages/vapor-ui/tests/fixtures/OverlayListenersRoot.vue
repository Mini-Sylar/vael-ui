<template>
  <Dialog v-model:open="dialogOpen" title="Listeners" @keydown="log(`dialog-${$event.key}`)">
    <button type="button" data-testid="inside">Inside</button>
  </Dialog>
  <Message closable title="Saved" @click="log('message-click')" />
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import { Dialog, Message } from 'vael-ui/vapor'

const props = defineProps<{ events: string[] }>()
const dialogOpen = ref(true)
function log(name: string) {
  props.events.push(name)
}
</script>
