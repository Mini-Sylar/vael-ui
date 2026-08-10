<template>
  <button data-testid="trigger" @click="open = true">Open</button>
  <Dialog v-model:open="open" aria-label="Long dialog">
    <template #default>
      <p v-for="line in lines" :key="line">{{ line }}</p>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Dialog from '../../src/components/Dialog/Dialog.vue'

const open = shallowRef(false)
const lines = Array.from({ length: 60 }, (_, i) => `Line ${i} of long content to force scrolling.`)
</script>
