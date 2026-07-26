<template>
  <div class="not-found">
    <DitherBackground />
    <div class="not-found-content">
      <p class="not-found-code">404</p>
      <h1 class="not-found-title">{{ t('notFound.title') }}</h1>
      <p class="not-found-body">{{ t('notFound.body') }}</p>
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
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { Button } from 'vael-ui'
import DitherBackground from '../components/DitherBackground.vue'

const { t } = useI18n()
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

.not-found-actions {
  display: flex;
  gap: 0.75rem;
  margin-block-start: 1rem;
}

.cta-link {
  text-decoration: none;
}
</style>
