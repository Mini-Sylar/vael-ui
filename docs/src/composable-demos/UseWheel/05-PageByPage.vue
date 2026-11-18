<template>
  <section class="demo">
    <h3>One page at a time</h3>
    <p class="note">
      With <code>size: 'auto'</code> each page is as wide as the element, whatever its width, and
      stays in place when the window resizes. The dots call <code>goTo</code>.
    </p>
    <div
      ref="el"
      class="pager"
      tabindex="0"
      aria-roledescription="carousel"
      aria-label="Pages"
      @keydown="wheel.onKeydown"
    >
      <div
        v-for="i in pages"
        :key="i"
        class="pager-page"
        :style="{ '--hue': i * 60 }"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i} of ${pages}`"
      >
        Page {{ i }}
      </div>
    </div>
    <div class="pager-dots">
      <button
        v-for="i in pages"
        :key="i"
        type="button"
        class="pager-dot"
        :aria-label="`Page ${i}`"
        :aria-current="index === i - 1 ? 'true' : undefined"
        @click="wheel.goTo(i - 1)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useWheel } from 'vael-ui'

const pages = 5
const index = shallowRef(0)
const wheel = useWheel(index, {
  el: useTemplateRef('el'),
  count: pages,
  size: 'auto',
  orientation: 'horizontal',
  align: 'start',
})
</script>

<style scoped>
.pager {
  position: relative;
  block-size: 8rem;
  overflow: hidden;
  cursor: grab;
  border-radius: var(--ui-radius);
}
.pager-page {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 600;
  background: oklch(0.55 0.15 var(--hue));
  translate: var(--ui-wheel-distance, 200vw) 0;
}
.pager-dots {
  display: flex;
  justify-content: center;
}
/* A finger-sized button with a small dot drawn inside it. */
.pager-dot {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.pager-dot::before {
  content: '';
  inline-size: 0.6rem;
  block-size: 0.6rem;
  border-radius: 50%;
  background: var(--ui-border);
}
.pager-dot[aria-current='true']::before {
  background: var(--ui-primary);
}
</style>
