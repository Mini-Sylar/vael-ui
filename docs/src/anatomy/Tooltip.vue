<!-- Tooltip shown: its positioner and the panel it holds, above the button it describes. -->
<template>
  <div data-specimen class="specimen">
    <!-- Held open: it never closes, so it stays while you point at its parts. -->
    <Tooltip :open="true" @update:open="() => {}">
      <template #trigger="{ setTriggerEl }">
        <Button :ref="setTriggerEl" variant="outline" aria-label="Copy link">
          <template #leading><PhLink /></template>
          Copy link
        </Button>
      </template>
      Copy the invite link
    </Tooltip>
  </div>
</template>

<script setup lang="ts">
import { Button, Tooltip } from 'vael-ui'
import { PhLink } from '@phosphor-icons/vue'
</script>

<style scoped>
.specimen {
  display: flex;
  align-items: end;
  justify-content: center;
  inline-size: min(18rem, 100%);
  min-block-size: 6rem;
}
</style>
