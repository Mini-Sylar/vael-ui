<template>
  <article class="prose">
    <h1>{{ t('nav.tailwindGuide') }}</h1>
    <p>
      vael-ui doesn't use Tailwind itself. Its own styles live in a single
      <code>@layer ui-components</code> block, shipped as plain CSS. That layering is what makes it
      safe to use vael-ui in a project that already has Tailwind: unlayered rules (which is what
      Tailwind's utility classes are) always win over anything inside a <code>@layer</code>,
      regardless of source order or specificity. So a Tailwind utility class on a vael-ui component
      always overrides the library's own default, with no <code>!important</code> and no specificity
      fights.
    </p>

    <h2>Import order</h2>
    <p>The one rule that matters: import vael-ui's stylesheet before your own Tailwind CSS.</p>
    <CodeBlock
      lang="typescript"
      code="// main.ts
import 'vael-ui/style.css' // first
import './style.css' // your Tailwind entry, second"
    />
    <p>
      This has nothing to do with the cascade. It's just so vael-ui's <code>@layer</code> block is
      declared before your own styles, which is what lets Tailwind's utilities win by default once
      both are loaded.
    </p>

    <h2>Merging classes with tailwind-merge</h2>
    <p>
      Every vael-ui component accepts a <code>ui</code> prop for its part classes (e.g.
      <code>:ui="{ root: 'my-class' }"</code>). If you're passing Tailwind utility classes there and
      want conflicting utilities to resolve the way <code>tailwind-merge</code> would (last one wins
      per property, rather than both landing in the DOM), wire it up once on
      <code>ConfigProvider</code>:
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
    <p>
      Every <code>ui.*</code> part class in the whole tree now passes through
      <code>twMerge</code> before it's applied.
    </p>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CodeBlock from '../../components/CodeBlock.vue'

const { t } = useI18n()
</script>
