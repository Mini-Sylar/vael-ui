<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('nuxt.title') }}</h1>
    <p>{{ t('nuxt.intro') }}</p>

    <h2 id="setup">{{ t('nuxt.setupTitle') }}</h2>
    <p>{{ t('nuxt.setupIntro') }}</p>
    <CodeBlock
      lang="typescript"
      code="// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vael-ui/nuxt'],
})"
    />
    <p>{{ t('nuxt.setupOutro') }}</p>
    <CodeBlock
      code='<template>
  <Button variant="primary">Save</Button>
</template>'
    />

    <h2 id="exclude">{{ t('nuxt.excludeTitle') }}</h2>
    <p v-html="t('nuxt.excludeIntro')" />
    <CodeBlock
      lang="typescript"
      code="export default defineNuxtConfig({
  modules: ['vael-ui/nuxt'],
  vaelUi: {
    exclude: ['Button'],
  },
})"
    />

    <h2 id="vdom-only">{{ t('nuxt.vdomOnlyTitle') }}</h2>
    <p v-html="t('nuxt.vdomOnlyIntro')" />

    <h2 id="resolver">{{ t('nuxt.resolverTitle') }}</h2>
    <i18n-t keypath="nuxt.resolverIntro" tag="p" scope="global">
      <template #link>
        <RouterLink to="/docs/guides/auto-import">{{ t('nuxt.resolverIntroLink') }}</RouterLink>
      </template>
    </i18n-t>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import { useBreadcrumbSchema } from '../../composables/useBreadcrumbSchema'

const { t } = useI18n()
useHead({ title: () => t('nuxt.title') })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('nuxt.title'), url: 'https://vael-ui.dev/docs/guides/nuxt' },
])

const tocLinks = computed(() => [
  { id: 'setup', label: t('nuxt.setupTitle') },
  { id: 'exclude', label: t('nuxt.excludeTitle') },
  { id: 'vdom-only', label: t('nuxt.vdomOnlyTitle') },
  { id: 'resolver', label: t('nuxt.resolverTitle') },
])
</script>
