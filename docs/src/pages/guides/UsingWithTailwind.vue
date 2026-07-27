<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('nav.tailwindGuide') }}</h1>
    <i18n-t keypath="tailwind.layerNote" tag="p" scope="global">
      <template #layer><code>@layer ui-components</code></template>
      <template #important><code>!important</code></template>
      <template #link>
        <RouterLink to="/docs/guides/styling-and-layers">{{
          t('tailwind.layerNoteLink')
        }}</RouterLink>
      </template>
    </i18n-t>
    <CodeBlock
      lang="typescript"
      code="import 'vael-ui/style.css'
import './style.css' // your Tailwind entry"
    />

    <h2 id="merging">{{ t('tailwind.mergingTitle') }}</h2>
    <p v-html="t('tailwind.mergingIntro')" />
    <CodeBlock
      lang="typescript"
      code="import { twMerge } from 'tailwind-merge'
import { ConfigProvider } from 'vael-ui'"
    />
    <CodeBlock
      code='<ConfigProvider :class-merge="twMerge">
  <YourApp />
</ConfigProvider>'
    />
    <p v-html="t('tailwind.mergingNote')" />
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
useHead({ title: () => t('nav.tailwindGuide') })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('nav.tailwindGuide'), url: 'https://vael-ui.dev/docs/guides/tailwind' },
])

const tocLinks = computed(() => [{ id: 'merging', label: t('tailwind.mergingTitle') }])
</script>
