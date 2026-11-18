<template>
  <span data-testid="rich"><b>{{ label }}</b> content</span>
</template>

<script setup lang="ts">
defineProps<{ label: string }>()
</script>
