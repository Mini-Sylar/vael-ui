<template>
  <article class="prose">
    <h1>{{ t('stylingLayers.title') }}</h1>
    <i18n-t keypath="stylingLayers.intro" tag="p" scope="global">
      <template #layer><code>@layer ui-components</code></template>
    </i18n-t>

    <CodeBlock
      code="/* your app's main stylesheet, e.g. style.css */
@layer app-base, ui-components;

@layer app-base {
  * { margin: 0; box-sizing: border-box; }
  button, input, textarea, select { font: inherit; }
}"
    />
    <CodeBlock
      lang="typescript"
      code="// main.ts
import './style.css'        // your base layer, loads first
import 'vael-ui/style.css'  // now sorts after app-base"
    />

    <p>{{ t('stylingLayers.orderNote') }}</p>

    <i18n-t keypath="stylingLayers.overrideNote" tag="p" scope="global">
      <template #code><code>ui</code></template>
      <template #link>
        <RouterLink to="/docs/guides/tailwind">{{
          t('stylingLayers.overrideNoteLink')
        }}</RouterLink>
      </template>
    </i18n-t>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CodeBlock from '../../components/CodeBlock.vue'

const { t } = useI18n()
</script>
