<template>
  <section class="demo">
    <h3><code>autoHide</code>: transparent until hover, focus or scroll</h3>
    <p class="note">
      An overlay scrollbar: hidden at rest, it fades in on hover, on focus and while you scroll, so
      it stays out of the content's way. To change the thumb's color or size, set
      <code>--ui-scroll-thumb</code>, <code>--ui-scroll-thumb-hover</code> and
      <code>--ui-scroll-size</code> through <code>ui.viewport</code>; there are no separate props
      for them.
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
