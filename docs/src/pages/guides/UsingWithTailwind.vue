<template>
  <article class="prose">
    <h1>{{ t('nav.tailwindGuide') }}</h1>
    <p>
      vael-ui ships in <code>@layer ui-components</code>. Tailwind's utility classes are unlayered,
      and unlayered CSS always wins over a layer regardless of specificity or import order, so a
      Tailwind utility on a vael-ui component always overrides the library's default. No
      <code>!important</code>, no specificity fights, nothing to configure. See
      <RouterLink to="/docs/guides/styling-and-layers">Styling and cascade layers</RouterLink> for
      the general mechanics.
    </p>
    <CodeBlock
      lang="typescript"
      code="import 'vael-ui/style.css'
import './style.css' // your Tailwind entry"
    />

    <h2>Merging classes with tailwind-merge</h2>
    <p>
      Every component accepts a <code>ui</code> prop for part classes (e.g.
      <code>:ui="{ root: 'my-class' }"</code>). To resolve conflicting Tailwind utilities there the
      way <code>tailwind-merge</code> would (last one wins per property), wire it up once:
    </p>
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
    <p>Every <code>ui.*</code> part class in the tree now passes through <code>twMerge</code>.</p>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CodeBlock from '../../components/CodeBlock.vue'

const { t } = useI18n()
</script>
