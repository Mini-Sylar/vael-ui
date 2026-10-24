<template>
  <div class="guide-layout" :class="{ 'guide-layout--wide': wide }">
    <article v-highlight-code v-scrollable-tables class="prose">
      <slot />
      <DocsPager />
    </article>
    <OnThisPage v-if="!wide" :links="links" />
  </div>
</template>

<script setup lang="ts">
import DocsPager from './DocsPager.vue'
import OnThisPage from './OnThisPage.vue'
import { vHighlightCode } from '../composables/vHighlightCode'
import { vScrollableTables } from '../composables/vScrollableTables'

defineProps<{
  links: { id: string; label: string }[]
  /** A gallery page: one wide column, no table of contents. */
  wide?: boolean
}>()
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

.guide-layout--wide {
  grid-template-columns: minmax(0, 76rem);
}

.guide-layout--wide > .prose {
  max-width: none;
}

@media (max-width: 1100px) {
  .guide-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
