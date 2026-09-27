<template>
  <span data-testid="text">{{ text }}</span>
  <button data-testid="set" @click="text = 'local'">set</button>
</template>
<script setup lang="ts" vapor>
const text = defineModel<string>('text', { default: '' })
defineProps<{ n?: number }>()
</script>
