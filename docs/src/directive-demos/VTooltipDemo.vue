<template>
  <div class="v-tooltip-demo">
    <Button v-tooltip="'Copy to clipboard'" size="sm" variant="secondary">Copy</Button>
    <Button v-tooltip.top="{ content: 'Delete', openDelay: 0 }" size="sm" variant="danger">
      Delete
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button, vTooltip } from 'vael-ui'
</script>

<style scoped>
.v-tooltip-demo {
  display: flex;
  gap: 0.75rem;
}
</style>
