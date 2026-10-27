<!-- Popover open: its positioner and the panel it holds, opened from a button. -->
<template>
  <div data-specimen class="specimen">
    <Popover v-model:open="open" open-on-trigger-click :close-on-outside="false">
      <template #trigger>
        <Button variant="outline">
          <template #leading><PhShareNetwork /></template>
          Share
        </Button>
      </template>
      <form class="share" @submit.prevent>
        <strong>Share this document</strong>
        <span class="muted">Anyone you invite can view and comment.</span>
        <Input model-value="grace@hopper.dev" size="sm" aria-label="Email" />
        <Button size="sm">Send invite</Button>
      </form>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button, Input, Popover } from 'vael-ui'
import { PhShareNetwork } from '@phosphor-icons/vue'

// Open from the start, and kept open while you point at its parts.
const open = ref(true)
</script>

<style scoped>
.specimen {
  display: flex;
  justify-content: center;
  inline-size: min(18rem, 100%);
  min-block-size: 16rem;
}
.share {
  display: grid;
  gap: 0.5rem;
  inline-size: 15rem;
}
.muted {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
