<template>
  <button data-testid="open-a" @click="openA = true">Open A</button>
  <button data-testid="reopen-a" @click="reopenA">Reopen A</button>
  <output data-testid="state-a">{{ openA ? 'open' : 'closed' }}</output>
  <output data-testid="state-b">{{ openB ? 'open' : 'closed' }}</output>

  <Dialog v-model:open="openA" aria-label="Outer" close-on-history-back>
    <button data-testid="open-b" @click="openB = true">Open B</button>
    <Dialog v-model:open="openB" aria-label="Inner" close-on-history-back>
      <p>Inner</p>
    </Dialog>
  </Dialog>
</template>

<script setup lang="ts">
import { nextTick, shallowRef } from 'vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'

const openA = shallowRef(false)
const openB = shallowRef(false)

// Closes A, then reopens it before the async history.back() from the close has landed.
async function reopenA() {
  openA.value = false
  await nextTick()
  setTimeout(() => (openA.value = true))
}
</script>
