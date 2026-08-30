<template>
  <section class="demo">
    <h3>Vertical orientation</h3>
    <p class="note">↑/↓ move focus instead of ←/→, Home/End still jump to the ends.</p>
    <div class="row">
      <Toolbar aria-label="Page tools" orientation="vertical" class="toolbar-vertical">
        <Button size="sm" variant="ghost" icon aria-label="Cut">
          <PhScissors weight="bold" />
        </Button>
        <Button size="sm" variant="ghost" icon aria-label="Copy">
          <PhCopy weight="bold" />
        </Button>
        <Button size="sm" variant="ghost" icon aria-label="Paste">
          <PhClipboardText weight="bold" />
        </Button>
      </Toolbar>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button, Toolbar } from 'vael-ui'
import { PhClipboardText, PhCopy, PhScissors } from '@phosphor-icons/vue'
</script>

<style scoped>
.toolbar-vertical {
  inline-size: 3rem;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
}
</style>
