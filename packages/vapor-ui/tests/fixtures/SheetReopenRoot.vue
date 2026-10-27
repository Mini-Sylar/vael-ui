<template>
  <button data-testid="toggle" @click="open = !open">toggle</button>
  <BottomSheet v-model:open="open" title="Sheet"><p>Body</p></BottomSheet>
</template>

<script setup lang="ts" vapor>
// Built `vael-ui/vapor`: a sheet opened, closed and opened again.
import { shallowRef } from 'vue'
import { BottomSheet } from 'vael-ui/vapor'

const open = shallowRef(false)
defineExpose({ open })
</script>
