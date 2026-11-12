<template>
  <div class="v-scroll-mask-demos">
    <div
      v-scroll-mask
      class="v-scroll-mask-demo"
      tabindex="0"
      role="region"
      aria-label="Scrolling content"
    >
      <p v-for="n in 12" :key="n">Line {{ n }} of a tall block of content.</p>
    </div>
    <!-- `.x` fades the sides of a box that scrolls across. -->
    <div
      v-scroll-mask.x
      class="v-scroll-mask-row"
      tabindex="0"
      role="region"
      aria-label="Scrolling tags"
    >
      <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { vScrollMask } from 'vael-ui'

const tags = ['Design', 'Engineering', 'Product', 'Support', 'Finance', 'Legal', 'People', 'Sales']
</script>

<style scoped>
.v-scroll-mask-demos {
  display: grid;
  gap: 0.75rem;
}
.v-scroll-mask-row {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.5rem 0.25rem;
  scrollbar-width: none;
}
.tag {
  flex: none;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  font-size: 0.8125rem;
}
.v-scroll-mask-demo {
  max-block-size: 8rem;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  font-size: 0.875rem;
}
.v-scroll-mask-demo p {
  margin: 0.375rem 0;
}
</style>
