<template>
  <section class="demo">
    <h3>The page, and one element</h3>
    <p class="note">
      Scroll the page. The bar follows the whole page; the panel turns as it passes through the
      screen. Neither re-renders this component.
    </p>
    <div class="track">
      <div v-animate="{ animate: { scale: ['0 1', '1 1'] }, progress: () => page }" class="bar" />
    </div>
    <div
      ref="panel"
      v-animate="{
        animate: { rotate: [-6, 0, 6], opacity: [0.3, 1, 0.3] },
        progress: () => through,
        spring: 'smooth',
      }"
      class="panel"
    >
      Passing through
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useScrollProgress, vAnimate } from 'vael-ui/motion'

const panel = useTemplateRef<HTMLElement>('panel')
// The page from top to bottom.
const page = useScrollProgress()
// The panel from entering the screen to having left it.
const through = useScrollProgress(panel)
</script>

<style scoped>
.track {
  block-size: 4px;
  margin-bottom: 1.5rem;
  border-radius: 999px;
  background: var(--ui-border);
  overflow: hidden;
}
.bar {
  block-size: 100%;
  background: var(--ui-primary);
  transform-origin: left;
}
.panel {
  display: grid;
  place-items: center;
  block-size: 8rem;
  border-radius: var(--ui-radius);
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  font-weight: 600;
}
</style>
