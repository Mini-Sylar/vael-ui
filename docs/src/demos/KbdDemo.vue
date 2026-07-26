<template>
  <section class="demo">
    <h2>Kbd</h2>
    <p class="note">
      A single keyboard key glyph, inline, no variants. Pairs naturally with
      <code>Tooltip</code>, a <code>Menu</code> item's shortcut hint, or plain body text.
    </p>

    <h3>Single keys</h3>
    <div class="row kbd-row">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Enter</Kbd>
    </div>

    <h3>A shortcut, inline with text</h3>
    <p class="note kbd-row">Press <Kbd>⌘</Kbd><Kbd>K</Kbd> to open the command palette.</p>
  </section>
</template>

<script setup lang="ts">
import { Kbd } from 'vael-ui'
</script>

<style scoped>
.kbd-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
</style>
