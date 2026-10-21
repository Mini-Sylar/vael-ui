<template>
  <div data-testid="probe">probe</div>
</template>
<script setup lang="ts">
import { onUnmounted } from 'vue'
const props = defineProps<{ onGone: () => void }>()
onUnmounted(() => props.onGone())
</script>
