<template>
  <nav v-if="neighbors.prev || neighbors.next" class="page-nav" :aria-label="t('nav.pagination')">
    <RouterLink
      v-if="neighbors.prev"
      :to="neighbors.prev.to"
      class="page-nav-card page-nav-card--prev"
      rel="prev"
    >
      <span class="page-nav-meta">
        <PhArrowLeft :size="12" class="page-nav-arrow" aria-hidden="true" />
        {{ t('nav.previous') }} · {{ neighbors.prev.section }}
      </span>
      <span class="page-nav-label">{{ neighbors.prev.label }}</span>
    </RouterLink>
    <RouterLink
      v-if="neighbors.next"
      :to="neighbors.next.to"
      class="page-nav-card page-nav-card--next"
      rel="next"
    >
      <span class="page-nav-meta">
        {{ t('nav.next') }} · {{ neighbors.next.section }}
        <PhArrowRight :size="12" class="page-nav-arrow" aria-hidden="true" />
      </span>
      <span class="page-nav-label">{{ neighbors.next.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PhArrowLeft, PhArrowRight } from '@phosphor-icons/vue'
import { usePageNeighbors } from '../docsNav'

const { t } = useI18n()
const neighbors = usePageNeighbors()
</script>

<style scoped>
.page-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-block-start: 4rem;
}

.page-nav-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  color: var(--ui-text);
  text-decoration: none;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

/* With no previous page, Next still sits on the right. */
.page-nav-card--next {
  grid-column: 2;
  align-items: flex-end;
  text-align: end;
}

.page-nav-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.page-nav-label {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.page-nav-arrow {
  transition: translate 150ms var(--ui-ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .page-nav-card:hover {
    border-color: var(--ui-border-strong);
    background: color-mix(in oklch, var(--ui-text) 3%, transparent);
  }
  .page-nav-card--prev:hover .page-nav-arrow {
    translate: -2px 0;
  }
  .page-nav-card--next:hover .page-nav-arrow {
    translate: 2px 0;
  }
}

.page-nav-card:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

/* Stacked on phones, Next first: it's the way most people go. */
@media (max-width: 640px) {
  .page-nav {
    grid-template-columns: minmax(0, 1fr);
  }
  .page-nav-card--next {
    grid-column: auto;
    order: -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-nav-arrow {
    transition: none;
  }
}
</style>
