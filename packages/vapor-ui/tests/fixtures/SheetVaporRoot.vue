<template>
  <BottomSheet v-model:open="open" title="Sheet"><p>Body</p></BottomSheet>
</template>

<script setup lang="ts" vapor>
// The built Vapor BottomSheet: its exit must play, not vanish (Vapor v-show + style patch bug).
import { shallowRef } from 'vue'
import { BottomSheet } from 'vael-ui/vapor'

const open = shallowRef(true)
defineExpose({ open })
</script>
