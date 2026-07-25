<template>
  <article class="prose">
    <h1>{{ t('gettingStarted.title') }}</h1>
    <p>
      vael-ui is a Vue 3 component library with a real Vue Vapor build. Every component compiles
      through Vapor's no-virtual-DOM runtime, not just the classic one. It's also
      animation-agnostic: plain CSS by default, or bring your own animation library through exposed
      refs and slots.
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
    <p>Import the stylesheet once, before your own global CSS:</p>
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
      vael-ui ships both builds from the same package, generated from the same source. Every
      component is written once, then compiled a second time through Vapor's compiler. Pick
      whichever your app runs, or mix both: Vue 3.6 supports VDOM/Vapor interop in one app. Every
      component page in these docs has the same toggle you just used, so you can compare the two
      side by side.
    </p>

    <h2>{{ t('gettingStarted.darkModeTitle') }}</h2>
    <p>
      Dark mode is CSS-only: vael-ui responds to <code>&lt;html data-theme="dark"&gt;</code> and,
      failing that, <code>prefers-color-scheme</code>. It ships no toggle UI of its own;
      <code>useColorScheme()</code> handles the state part (persistence, applying the attribute,
      live OS-preference updates) so you don't have to:
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
      <code>v-tooltip</code> also needs a single <code>&lt;TooltipHost /&gt;</code> mounted once,
      anywhere in your app. It's a shared singleton every tooltip renders through. In a Vapor app,
      import the same directives from <code>vael-ui/vapor</code> instead and register them the same
      way.
    </p>
  </article>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
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
