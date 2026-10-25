<template>
  <nav v-if="prev || next" class="docs-pager" :aria-label="t('nav.pager')">
    <RouterLink v-if="prev" :to="routeFor(prev.value)" class="docs-pager-link" rel="prev">
      <span class="docs-pager-hint">
        <PhArrowLeft :size="12" aria-hidden="true" />
        {{ t('nav.previous') }}
      </span>
      <span class="docs-pager-title">{{ prev.label }}</span>
    </RouterLink>
    <RouterLink
      v-if="next"
      :to="routeFor(next.value)"
      class="docs-pager-link docs-pager-link--next"
      rel="next"
    >
      <span class="docs-pager-hint">
        {{ t('nav.next') }}
        <PhArrowRight :size="12" aria-hidden="true" />
      </span>
      <span class="docs-pager-title">{{ next.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { PhArrowLeft, PhArrowRight } from '@phosphor-icons/vue'
import { MOTION_LINK, MOTION_ROUTES, navSections, routeFor, valueFor } from '../docsNav'

const { t } = useI18n()
const route = useRoute()

// A Motion page pages through the Motion list, in its order.
const mode = computed(() =>
  route.name === 'composable'
    ? 'composables'
    : MOTION_ROUTES.some((page) => page.routeName === route.name)
      ? 'motion'
      : 'components',
)
// The row that opens the Motion section isn't a next page: the guides read straight on.
const pages = computed(() =>
  navSections(mode.value, t)
    .flatMap((section) => section.items)
    .filter((page) => mode.value === 'motion' || page.value !== MOTION_LINK),
)
const index = computed(() => pages.value.findIndex((page) => page.value === valueFor(route)))
const prev = computed(() => (index.value > 0 ? pages.value[index.value - 1] : undefined))
const next = computed(() => (index.value >= 0 ? pages.value[index.value + 1] : undefined))
</script>

<style scoped>
.docs-pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-block-start: 4rem;
  padding-block-start: 2rem;
  border-block-start: 1px solid var(--ui-border);
}

.docs-pager-link {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  color: var(--ui-text);
  text-decoration: none;
  transition: border-color 150ms var(--ui-ease-out);
}

.docs-pager-link--next {
  grid-column: 2;
  align-items: flex-end;
  text-align: end;
}

@media (hover: hover) and (pointer: fine) {
  .docs-pager-link:hover {
    border-color: color-mix(in oklch, var(--ui-primary) 50%, var(--ui-border));
  }
}

.docs-pager-link:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.docs-pager-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.docs-pager-title {
  font-size: 0.9375rem;
  font-weight: 500;
}

@media (max-width: 560px) {
  .docs-pager {
    grid-template-columns: minmax(0, 1fr);
  }

  .docs-pager-link--next {
    grid-column: 1;
  }
}
</style>
