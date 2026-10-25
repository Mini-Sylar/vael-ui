<template>
  <section class="demo">
    <h3>Linked to scroll</h3>
    <p class="note">
      Scroll the page: the panel turns and brightens as it passes through the screen.
    </p>
    <div
      ref="panel"
      v-animate="{
        animate: { rotate: [-6, 0, 6], opacity: [0.3, 1, 0.3] },
        progress: () => progress,
        spring: 'smooth',
      }"
      class="panel"
    >
      Scroll-linked
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useScrollProgress, vAnimate } from 'vael-ui/motion'

const panel = useTemplateRef<HTMLElement>('panel')
// From entering the screen to having left it, 0 to 1. Read in the getter, so no re-render.
const progress = useScrollProgress(panel)
</script>

<style scoped>
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
