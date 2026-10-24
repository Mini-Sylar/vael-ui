<template>
  <div class="not-found">
    <DitherBackground />
    <div class="not-found-content">
      <p class="not-found-code">404</p>
      <h1 class="not-found-title">{{ t('notFound.title') }}</h1>
      <p class="not-found-body">{{ t('notFound.body') }}</p>
      <p v-if="suggestions.length" class="not-found-suggestions">
        {{ t('notFound.didYouMean') }}
        <template v-for="(entry, index) in suggestions" :key="entry.value">
          <RouterLink :to="routeFor(entry.value)" class="suggestion-link">{{
            entry.label
          }}</RouterLink
          ><template v-if="index < suggestions.length - 1">, </template>
        </template>
      </p>
      <div class="not-found-actions">
        <RouterLink to="/" class="cta-link">
          <Button>{{ t('notFound.home') }}</Button>
        </RouterLink>
        <RouterLink to="/docs/getting-started" class="cta-link">
          <Button variant="outline">{{ t('nav.gettingStarted') }}</Button>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Button } from 'vael-ui'
import DitherBackground from '../components/DitherBackground.vue'
import { allComponents } from '../taxonomy'
import { allComposables } from '../composablesTaxonomy'
import { DIRECTIVES } from '../directivesTaxonomy'
import { directivesContent } from '../directivesContent'
import { composableValue, directiveValue, routeFor } from '../docsNav'
import { search, type SearchEntry } from '../search/fuzzy'

const { t } = useI18n()
const route = useRoute()

const entries: (SearchEntry & { value: string })[] = [
  ...allComponents.map((name) => ({ label: name, value: name })),
  ...allComposables.map((name) => ({ label: name, value: composableValue(name) })),
  // The sidebar's label (v-tooltip), so the suggestion reads like the page it opens.
  ...DIRECTIVES.map((name) => ({
    label: directivesContent[name]?.label ?? name,
    value: directiveValue(name),
  })),
]

// The last path segment is usually a mistyped page name, so offer the closest real ones.
const suggestions = computed(() => {
  const slug = route.path.split('/').filter(Boolean).at(-1) ?? ''
  let query = slug
  try {
    query = decodeURIComponent(slug)
  } catch {
    // A malformed escape is still worth matching as typed.
  }
  query = query.replace(/[-_]+/g, ' ').trim()
  return query ? search(query, entries, 3) : []
})

useHead({
  title: () => t('notFound.title'),
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<style scoped>
.not-found {
  position: relative;
  min-height: calc(100vh - var(--docs-header-height));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.not-found-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  padding: 2rem;
}

.not-found-code {
  margin: 0;
  font-size: 4.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--ui-text-muted);
}

.not-found-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.not-found-body {
  margin: 0;
  color: var(--ui-text-muted);
  max-inline-size: 26rem;
}

.not-found-suggestions {
  margin: 0;
  color: var(--ui-text-muted);
  max-inline-size: 26rem;
}

.suggestion-link {
  color: var(--ui-text);
  text-decoration: underline;
  text-decoration-color: var(--ui-text-muted);
  text-underline-offset: 3px;
}

.not-found-actions {
  display: flex;
  gap: 0.75rem;
  margin-block-start: 1rem;
}

.cta-link {
  text-decoration: none;
}
</style>
