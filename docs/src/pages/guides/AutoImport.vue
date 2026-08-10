<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('autoImport.title') }}</h1>
    <p>{{ t('autoImport.intro') }}</p>
    <CodeBlock lang="bash" code="npm install -D unplugin-vue-components" />

    <h2 id="setup">{{ t('autoImport.setupTitle') }}</h2>
    <p>{{ t('autoImport.setupIntro') }}</p>
    <CodeBlock
      lang="typescript"
      code="// vite.config.ts
import Components from 'unplugin-vue-components/vite'
import { VaelUiResolver } from 'vael-ui/resolver'

export default {
  plugins: [
    Components({ resolvers: [VaelUiResolver()] }),
    // ...your other plugins, vue() included
  ],
}"
    />
    <p>{{ t('autoImport.setupOutro') }}</p>
    <CodeBlock
      code='<template>
  <Button variant="primary">Save</Button>
</template>

&lt;script setup lang="ts"&gt;
// no import — unplugin-vue-components inserts it at build time
&lt;/script&gt;'
    />

    <h2 id="vapor">{{ t('autoImport.vaporTitle') }}</h2>
    <p v-html="t('autoImport.vaporIntro')" />
    <CodeBlock code="VaelUiResolver({ variant: 'vapor' })" />

    <h2 id="css">{{ t('autoImport.cssTitle') }}</h2>
    <p v-html="t('autoImport.cssIntro')" />

    <h2 id="bundlers">{{ t('autoImport.bundlersTitle') }}</h2>
    <p v-html="t('autoImport.bundlersIntro')" />
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import { useBreadcrumbSchema } from '../../composables/useBreadcrumbSchema'

const { t } = useI18n()
useHead({ title: () => t('autoImport.title') })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('autoImport.title'), url: 'https://vael-ui.dev/docs/guides/auto-import' },
])

const tocLinks = computed(() => [
  { id: 'setup', label: t('autoImport.setupTitle') },
  { id: 'vapor', label: t('autoImport.vaporTitle') },
  { id: 'css', label: t('autoImport.cssTitle') },
  { id: 'bundlers', label: t('autoImport.bundlersTitle') },
])
</script>
