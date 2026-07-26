<template>
  <article class="prose">
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

    <h2>{{ t('tailwind.mergingTitle') }}</h2>
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
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CodeBlock from '../../components/CodeBlock.vue'

const { t } = useI18n()
</script>
