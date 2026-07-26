<template>
  <article class="prose">
    <h1>{{ t('gettingStarted.title') }}</h1>
    <p>
      A Vue 3 component library with a full Vue Vapor build and an animation-agnostic design: plain
      CSS by default, or bring your own animation library.
    </p>

    <h2>{{ t('gettingStarted.installTitle') }}</h2>
    <p>vael-ui is published on npm. Install it with whichever package manager you use:</p>
    <SelectButton
      v-model="pm"
      size="sm"
      :allow-empty="false"
      :items="pmItems.map((item) => ({ label: item, value: item }))"
      class="pm-toggle"
    />
    <CodeBlock lang="bash" :code="installCode" />

    <h2>{{ t('gettingStarted.usageTitle') }}</h2>
    <p>
      Import the stylesheet once in your entry point (see
      <RouterLink to="/docs/guides/styling-and-layers">Styling and cascade layers</RouterLink>
      for base-style setup):
    </p>
    <CodeBlock
      lang="typescript"
      code="// main.ts
import 'vael-ui/style.css'"
    />
    <p>
      Then use any component: from <code>'vael-ui'</code> for the classic VDOM build, or
      <code>'vael-ui/vapor'</code> for the compiled Vapor build (Vue 3.6's no-virtual-DOM mode).
      Same props either way:
    </p>
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

    <h2>{{ t('gettingStarted.vaporTitle') }}</h2>
    <p>
      Both builds ship from the same package and source. Pick whichever your app runs, or mix both
      (Vue 3.6 supports VDOM/Vapor interop). Every component page has the same toggle to compare
      them.
    </p>

    <h2>{{ t('gettingStarted.darkModeTitle') }}</h2>
    <p>
      CSS-only: responds to <code>&lt;html data-theme="dark"&gt;</code>, falling back to
      <code>prefers-color-scheme</code>. No toggle UI shipped; <code>useColorScheme()</code> handles
      persistence and OS-preference updates:
    </p>
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

    <h2>{{ t('gettingStarted.directivesTitle') }}</h2>
    <p>
      <code>v-tooltip</code> and <code>v-scroll-mask</code> aren't global by default. If you use
      either in more than one component, register them once:
    </p>
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
    <p>
      <code>v-tooltip</code> also needs a <code>&lt;TooltipHost /&gt;</code> mounted once. In a
      Vapor app, import both directives from <code>vael-ui/vapor</code> instead.
    </p>
  </article>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { SelectButton } from 'vael-ui'
import CodeBlock from '../components/CodeBlock.vue'
import { defaultVariant } from '../preferences'

const { t } = useI18n()

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
</script>

<style scoped>
.usage-toggle {
  margin-bottom: 0.75rem;
}

.pm-toggle {
  margin-bottom: 0.75rem;
}
</style>
