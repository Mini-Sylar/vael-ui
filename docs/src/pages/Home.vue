<template>
  <div class="home">
    <h1>vael-ui</h1>
    <p>{{ t('home.tagline') }}</p>
    <RouterLink to="/docs/getting-started" class="cta">
      <Button>{{ t('nav.gettingStarted') }}</Button>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from 'vael-ui'

const { t } = useI18n()
</script>

<style scoped>
.home {
  min-height: calc(100vh - var(--docs-header-height));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
}

.cta {
  text-decoration: none;
  margin-top: 0.5rem;
}
</style>
