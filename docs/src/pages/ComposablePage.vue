<template>
  <article v-if="content" class="composable-page">
    <p v-if="category" class="eyebrow">{{ category }}</p>
    <h1>{{ name }}</h1>
    <p class="description">{{ content.description }}</p>

    <section id="install" class="section">
      <h2>{{ t('component.install') }}</h2>
      <CodeBlock lang="typescript" :code="installCode" />
    </section>

    <section id="usage" class="section">
      <h2>{{ t('component.examples') }}</h2>
      <div v-if="DemoComponent" class="composable-demo">
        <component :is="DemoComponent" />
      </div>
      <CodeBlock :lang="exampleLang" :code="exampleCode" />
    </section>

    <MetaTable
      id="parameters"
      :title="t('composable.parameters')"
      :rows="content.params"
      :empty-text="t('composable.noParameters')"
    />
    <MetaTable
      id="returns"
      :title="t('composable.returns')"
      :rows="content.returns"
      :empty-text="t('composable.noReturns')"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, watchEffect, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { composableCategoryOf } from '../composablesTaxonomy'
import { composablesContent } from '../composablesContent'
import { useBreadcrumbSchema } from '../composables/useBreadcrumbSchema'
import CodeBlock from '../components/CodeBlock.vue'
import MetaTable from '../components/MetaTable.vue'

const demoModules = import.meta.glob<{ default: Component }>('../composable-demos/*.vue')
const demoSources = import.meta.glob('../composable-demos/*.vue', {
  query: '?raw',
  import: 'default',
})

const { t } = useI18n()
const route = useRoute()

const name = computed(() => route.params.name as string)
const content = computed(() => composablesContent[name.value])
const category = computed(() => {
  const key = composableCategoryOf(name.value)
  return key ? t(`composablesTaxonomy.${key}`) : undefined
})

// UseConfirmAction -> UseConfirmActionDemo.vue
const demoFileKey = computed(() => {
  const n = name.value
  return `../composable-demos/${n.charAt(0).toUpperCase()}${n.slice(1)}Demo.vue`
})

// Cached per demo file — defineAsyncComponent(loader) creates a NEW
// component definition every call, so re-deriving this on each computed
// re-evaluation would make Vue treat it as a different component on every
// render (same reasoning as ComponentPage.vue's vdom/vapor component cache).
const demoComponentCache = new Map<string, Component>()
const DemoComponent = computed<Component | undefined>(() => {
  if (!content.value?.hasLiveDemo) return undefined
  const key = demoFileKey.value
  const loader = demoModules[key]
  if (!loader) return undefined
  let cached = demoComponentCache.get(key)
  if (!cached) {
    cached = defineAsyncComponent(loader)
    demoComponentCache.set(key, cached)
  }
  return cached
})

const exampleCode = shallowRef('')
// Live-demo composables show their real .vue source (real Vue syntax);
// code-only ones show a plain TS snippet — Shiki needs the right grammar
// for either to actually tokenize instead of silently rendering nothing.
const exampleLang = computed<'vue' | 'typescript'>(() =>
  content.value?.hasLiveDemo ? 'vue' : 'typescript',
)
watchEffect(async () => {
  if (content.value?.hasLiveDemo) {
    const mainLoader = demoSources[demoFileKey.value]
    const mainSource = mainLoader ? ((await mainLoader()) as string) : ''
    const extraFiles = content.value.extraSourceFiles ?? []
    const extraSources = await Promise.all(
      extraFiles.map(async (file) => {
        const loader = demoSources[`../composable-demos/${file}`]
        const source = loader ? ((await loader()) as string) : ''
        return `<!-- ${file} -->\n${source}`
      }),
    )
    exampleCode.value = [mainSource, ...extraSources].filter(Boolean).join('\n\n')
  } else {
    exampleCode.value = content.value?.exampleCode ?? ''
  }
})

const installCode = computed(() => {
  const names = content.value?.installNames ?? [name.value]
  return `import { ${names.join(', ')} } from 'vael-ui'`
})

useHead({ title: () => name.value })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: name.value, url: `https://vael-ui.dev/composables/${name.value}` },
])
</script>

<style scoped>
.composable-page {
  min-width: 0;
  max-width: 46rem;
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ui-text-muted);
  margin-bottom: 0.35rem;
}

.composable-page h1 {
  font-size: 2rem;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.description {
  color: var(--ui-text-muted);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.section {
  margin-top: 2.75rem;
}

.section h2 {
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  margin-bottom: 0.85rem;
}

.composable-demo {
  display: flex;
  padding: 2rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  background: var(--ui-surface);
  margin-bottom: 1rem;
}
</style>
