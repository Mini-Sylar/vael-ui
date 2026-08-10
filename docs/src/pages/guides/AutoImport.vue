<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('autoImport.title') }}</h1>
    <p>{{ t('autoImport.intro') }}</p>
    <SelectButton
      v-model="packageManager"
      size="sm"
      :allow-empty="false"
      :items="packageManagers.map((item) => ({ label: item, value: item }))"
      class="pm-toggle"
    />
    <CodeBlock lang="bash" :code="installCode" />

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

    <h2 id="one-import">{{ t('autoImport.oneImportTitle') }}</h2>
    <p v-html="t('autoImport.oneImportIntro')" />
    <CodeBlock
      lang="typescript"
      code="// vite.config.ts
export default {
  resolve: { conditions: ['vapor'] },
}"
    />
    <CodeBlock
      lang="json"
      code='// tsconfig.json
{
  "compilerOptions": {
    "customConditions": ["vapor"]
  }
}'
    />
    <Message variant="warning" :title="t('autoImport.oneImportNoteTitle')">
      {{ t('autoImport.oneImportNote') }}
    </Message>

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
import { Message, SelectButton } from 'vael-ui'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import { packageManager, packageManagers } from '../../preferences'
import { useBreadcrumbSchema } from '../../composables/useBreadcrumbSchema'

const { t } = useI18n()
useHead({ title: () => t('autoImport.title') })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('autoImport.title'), url: 'https://vael-ui.dev/docs/guides/auto-import' },
])

const INSTALL_COMMANDS: Record<(typeof packageManagers)[number], string> = {
  npm: 'npm install -D unplugin-vue-components',
  pnpm: 'pnpm add -D unplugin-vue-components',
  yarn: 'yarn add -D unplugin-vue-components',
  bun: 'bun add -D unplugin-vue-components',
}
const installCode = computed(() => INSTALL_COMMANDS[packageManager.value])

const tocLinks = computed(() => [
  { id: 'setup', label: t('autoImport.setupTitle') },
  { id: 'vapor', label: t('autoImport.vaporTitle') },
  { id: 'one-import', label: t('autoImport.oneImportTitle') },
  { id: 'css', label: t('autoImport.cssTitle') },
  { id: 'bundlers', label: t('autoImport.bundlersTitle') },
])
</script>

<style scoped>
.pm-toggle {
  margin-bottom: 0.75rem;
}
</style>
