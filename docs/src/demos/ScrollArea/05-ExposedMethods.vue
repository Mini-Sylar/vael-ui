<template>
  <section class="demo">
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
