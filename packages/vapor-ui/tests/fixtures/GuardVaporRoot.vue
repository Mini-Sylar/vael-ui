<template>
  <button data-testid="open" @click="open = true">open</button>
  <Dialog v-model:open="open" title="Discard?" :before-close="guard" />
</template>

<script setup lang="ts" vapor>
// The built Vapor Dialog behind a guard: pending holds it, the answer decides.
import { shallowRef } from 'vue'
import { Dialog } from 'vael-ui/vapor'

const open = shallowRef(false)
let answer: (allowed: boolean) => void = () => {}
const guard = () => new Promise<boolean>((resolve) => (answer = resolve))
defineExpose({ open, answer: (allowed: boolean) => answer(allowed) })
</script>
