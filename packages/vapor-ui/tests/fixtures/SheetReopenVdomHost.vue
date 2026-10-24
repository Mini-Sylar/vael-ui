<template>
  <button data-testid="toggle" @click="open = !open">toggle</button>
  <BottomSheet v-model:open="open" title="Sheet"><p>Body</p></BottomSheet>
</template>

<script setup lang="ts">
// A VDOM app hosting the Vapor BottomSheet, as the docs do in Vapor mode.
import { shallowRef } from 'vue'
import { BottomSheet } from 'vael-ui/vapor'

const open = shallowRef(false)
</script>
