<template>
  <section class="demo">
    <h3>Stacks correctly above a Dialog opened from inside it</h3>
    <p class="note">
      Popover and Dialog both derive their z-index from the same shared, open-order layer stack, so
      whichever actually opened most recently renders on top - regardless of which kind of overlay
      it is. Opening this Dialog from a button inside the Popover keeps the Popover open underneath
      it; the Dialog correctly stays on top instead of being buried behind the still-open Popover.
    </p>
    <Popover v-model:open="popoverOpen">
      <template #trigger="{ open, setTriggerEl }">
        <Button :ref="setTriggerEl" variant="outline" @click="popoverOpen = !popoverOpen">
          {{ open ? 'Close' : 'Open' }} popover
        </Button>
      </template>
      <template #default>
        <div class="popover-body">
          <p class="panel-text">This Popover is still open behind the Dialog.</p>
          <Button size="sm" @click="dialogOpen = true">Open a Dialog from here</Button>
        </div>
      </template>
    </Popover>

    <Dialog v-model:open="dialogOpen" title="Opened from the Popover">
      <p class="panel-text">
        This Dialog opened after the Popover, so it renders above it - not underneath.
      </p>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, Popover } from 'vael-ui'

const popoverOpen = shallowRef(false)
const dialogOpen = shallowRef(false)
</script>

<style scoped>
.popover-body {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
