<template>
  <section class="demo">
    <h3><code>autoHide</code>: transparent until hover/focus</h3>
    <p class="note">
      An overlay-style scrollbar (Chromium/WebKit): invisible at rest, fades in on hover so it
      doesn't compete with content for attention. Customize thumb color/size by overriding
      <code>--ui-scroll-thumb</code>/<code>--ui-scroll-thumb-hover</code>/<code
        >--ui-scroll-size</code
      >
      via the <code>ui.viewport</code> style escape hatch, no dedicated color/size props needed.
    </p>
    <ScrollArea auto-hide class="scroll-demo scroll-demo--vertical">
      <ul class="scroll-list">
        <li v-for="n in 24" :key="n">Item {{ n }}</li>
      </ul>
    </ScrollArea>
  </section>
</template>

<script setup lang="ts">
import { ScrollArea } from 'vael-ui'
</script>

<style scoped>
.scroll-demo {
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  margin-block-end: 1.5rem;
}
.scroll-demo--vertical {
  block-size: 12rem;
  max-inline-size: 20rem;
}
.scroll-list {
  margin: 0;
  padding: 0.5rem 1rem;
  list-style: none;
}
.scroll-list li {
  padding-block: 0.375rem;
  font-size: 0.875rem;
  border-block-end: 1px solid var(--ui-border);
}
.scroll-list li:last-child {
  border-block-end: 0;
}
</style>
