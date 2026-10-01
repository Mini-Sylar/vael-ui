<template>
  <div class="guide-layout">
    <article v-highlight-code class="prose">
      <slot />
      <PageNav />
    </article>
    <OnThisPage :links="links" />
  </div>
</template>

<script setup lang="ts">
import PageNav from './PageNav.vue'
import OnThisPage from './OnThisPage.vue'
import { vHighlightCode } from '../composables/vHighlightCode'

defineProps<{ links: { id: string; label: string }[] }>()
</script>

<style scoped>
/* A readable prose column, centered with its table of contents instead of
   pinned left on wide screens. */
.guide-layout {
  display: grid;
  grid-template-columns: minmax(0, 50rem) 13rem;
  justify-content: center;
  gap: 4rem;
  align-items: start;
}

@media (max-width: 1100px) {
  .guide-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
