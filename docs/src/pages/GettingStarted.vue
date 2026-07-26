<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('gettingStarted.title') }}</h1>
    <p>{{ t('gettingStarted.intro') }}</p>

    <h2 id="install">{{ t('gettingStarted.installTitle') }}</h2>
    <p>{{ t('gettingStarted.installIntro') }}</p>
    <SelectButton
      v-model="pm"
      size="sm"
      :allow-empty="false"
      :items="pmItems.map((item) => ({ label: item, value: item }))"
      class="pm-toggle"
    />
    <CodeBlock lang="bash" :code="installCode" />

    <h2 id="usage">{{ t('gettingStarted.usageTitle') }}</h2>
    <i18n-t keypath="gettingStarted.usageImportNote" tag="p" scope="global">
      <template #link>
        <RouterLink to="/docs/guides/styling-and-layers">{{
          t('gettingStarted.usageImportNoteLink')
        }}</RouterLink>
      </template>
    </i18n-t>
    <CodeBlock
      lang="typescript"
      code="// main.ts
import 'vael-ui/style.css'"
    />
    <p v-html="t('gettingStarted.usageIntro')" />
    <SelectButton
      v-model="defaultVariant"
      size="sm"
      :allow-empty="false"
      :items="[
        { label: t('component.vdom'), value: 'vdom' },
        { label: t('component.vapor'), value: 'vapor' },
      ]"
      class="usage-toggle"
    />
    <CodeBlock :code="usageCode" />

    <h2 id="vapor">{{ t('gettingStarted.vaporTitle') }}</h2>
    <p>{{ t('gettingStarted.vaporIntro') }}</p>

    <h2 id="dark-mode">{{ t('gettingStarted.darkModeTitle') }}</h2>
    <p v-html="t('gettingStarted.darkModeIntro')" />
    <CodeBlock
      lang="typescript"
      code="import { useColorScheme } from 'vael-ui'

const { mode, setMode } = useColorScheme({
  persist: {
    get: () => localStorage.getItem('theme'),
    set: (m) => localStorage.setItem('theme', m ?? ''),
  },
})"
    />

    <h2 id="directives">{{ t('gettingStarted.directivesTitle') }}</h2>
    <p v-html="t('gettingStarted.directivesIntro')" />
    <CodeBlock
      lang="typescript"
      code="// main.ts
import { createApp } from 'vue'
import { vTooltip, vScrollMask } from 'vael-ui'

const app = createApp(App)
app.directive('tooltip', vTooltip)
app.directive('scroll-mask', vScrollMask)
app.mount('#app')"
    />
    <p v-html="t('gettingStarted.directivesNote')" />
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { SelectButton } from 'vael-ui'
import CodeBlock from '../components/CodeBlock.vue'
import GuideLayout from '../components/GuideLayout.vue'
import { defaultVariant } from '../preferences'

const { t } = useI18n()
useHead({ title: () => t('gettingStarted.title') })

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
const pmItems: PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun']
const pm = shallowRef<PackageManager>('npm')

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: 'npm install vael-ui',
  pnpm: 'pnpm add vael-ui',
  yarn: 'yarn add vael-ui',
  bun: 'bun add vael-ui',
}
const installCode = computed(() => INSTALL_COMMANDS[pm.value])

const usageCode = computed(() => {
  const pkg = defaultVariant.value === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  return `<script setup lang="ts">
import { Button, ConfigProvider } from '${pkg}'
<${'/script>'}

<template>
  <ConfigProvider :theme="{ primary: '#ea580c', radius: '12px' }">
    <Button @click="save">Save</Button>
  </ConfigProvider>
</template>`
})

const tocLinks = computed(() => [
  { id: 'install', label: t('gettingStarted.installTitle') },
  { id: 'usage', label: t('gettingStarted.usageTitle') },
  { id: 'vapor', label: t('gettingStarted.vaporTitle') },
  { id: 'dark-mode', label: t('gettingStarted.darkModeTitle') },
  { id: 'directives', label: t('gettingStarted.directivesTitle') },
])
</script>

<style scoped>
.usage-toggle {
  margin-bottom: 0.75rem;
}

.pm-toggle {
  margin-bottom: 0.75rem;
}
</style>
