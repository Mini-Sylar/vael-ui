<template>
  <section class="demo">
    <h2>ScrollArea</h2>
    <p class="note">
      A native <code>overflow</code> + <code>scrollbar-width</code>/<code>::-webkit-scrollbar</code>
      styled viewport, not a JS-simulated thumb. <code>scroll-fade</code> (on by default) masks the
      edge as content scrolls under it, the same directive <code>Dialog</code>, <code>Select</code>,
      and <code>Combobox</code> already use internally.
    </p>

    <h3>Vertical</h3>
    <ScrollArea class="scroll-demo scroll-demo--vertical">
      <ul class="scroll-list">
        <li v-for="n in 24" :key="n">Item {{ n }}</li>
      </ul>
    </ScrollArea>

    <h3>Horizontal</h3>
    <ScrollArea orientation="horizontal" class="scroll-demo scroll-demo--horizontal">
      <div class="scroll-row">
        <div v-for="n in 12" :key="n" class="scroll-card">Card {{ n }}</div>
      </div>
    </ScrollArea>

    <h3><code>scrollFade</code> off</h3>
    <p class="note">No edge mask, just a plain scrollbar.</p>
    <ScrollArea :scroll-fade="false" class="scroll-demo scroll-demo--vertical">
      <ul class="scroll-list">
        <li v-for="n in 24" :key="n">Item {{ n }}</li>
      </ul>
    </ScrollArea>

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

    <h3>
      Exposed: <code>scrollToTop</code>/<code>scrollToBottom</code>, reactive
      <code>atTop</code>/<code>atBottom</code>
    </h3>
    <p class="note">
      Also exposes <code>scrollTop</code>/<code>scrollLeft</code>/<code>atStart</code>/<code
        >atEnd</code
      >
      and a generic <code>scrollTo(options)</code> — enough to build a "back to top" button or a
      scroll-position-synced companion visual without reaching into the DOM yourself.
    </p>
    <div class="row">
      <Button
        size="sm"
        variant="outline"
        :disabled="scrollState.atTop"
        @click="scrollAreaRef?.scrollToTop()"
        >Scroll to top</Button
      >
      <Button
        size="sm"
        variant="outline"
        :disabled="scrollState.atBottom"
        @click="scrollAreaRef?.scrollToBottom()"
        >Scroll to bottom</Button
      >
    </div>
    <ScrollArea ref="scrollAreaRef" class="scroll-demo scroll-demo--vertical" @scroll="onScroll">
      <ul class="scroll-list">
        <li v-for="n in 24" :key="n">Item {{ n }}</li>
      </ul>
    </ScrollArea>
  </section>
</template>

<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import { Button, ScrollArea } from 'vael-ui'

const scrollAreaRef = useTemplateRef('scrollAreaRef')
const scrollState = reactive({ atTop: true, atBottom: false })

function onScroll() {
  scrollState.atTop = scrollAreaRef.value?.atTop ?? true
  scrollState.atBottom = scrollAreaRef.value?.atBottom ?? false
}
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
.scroll-demo--horizontal {
  inline-size: 100%;
  max-inline-size: 36rem;
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
.scroll-row {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
}
.scroll-card {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 6rem;
  block-size: 4rem;
  border-radius: calc(var(--ui-radius) - 4px);
  background: var(--ui-muted);
  font-size: 0.8125rem;
  font-weight: 500;
}
</style>
