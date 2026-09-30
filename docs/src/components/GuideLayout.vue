<template>
  <div class="guide-layout">
    <article v-highlight-code class="prose">
      <slot />
    </article>
    <OnThisPage :links="links" />
  </div>
</template>

<script setup lang="ts">
import OnThisPage from './OnThisPage.vue'
import { vHighlightCode } from '../composables/vHighlightCode'

defineProps<{ links: { id: string; label: string }[] }>()
</script>

<style scoped>
.guide-layout {
  display: grid;
  grid-template-columns: minmax(0, 46rem) 1fr;
  gap: 4rem;
  align-items: start;
}

@media (max-width: 1100px) {
  .guide-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
