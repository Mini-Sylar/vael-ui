<template>
  <article v-if="content" class="directive-page">
    <p class="eyebrow">{{ t('nav.directives') }}</p>
    <h1>{{ content.label }}</h1>
    <p class="description">{{ content.description }}</p>

    <section id="install" class="section">
      <h2>{{ t('component.install') }}</h2>
      <CodeBlock lang="typescript" :code="installCode" />
    </section>

    <section id="usage" class="section">
      <h2>{{ t('component.examples') }}</h2>
      <div v-if="DemoComponent" class="directive-demo">
        <component :is="DemoComponent" />
      </div>
      <CodeBlock lang="vue" :code="exampleCode" />
    </section>

    <MetaTable id="value" :title="t('directive.value')" :rows="content.value" empty-text="" />
    <MetaTable
      v-if="content.modifiers?.length"
      id="modifiers"
      :title="t('directive.modifiers')"
      :rows="content.modifiers"
      :empty-text="t('directive.noModifiers')"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, watchEffect, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { directivesContent } from '../directivesContent'
import { useBreadcrumbSchema } from '../composables/useBreadcrumbSchema'
import CodeBlock from '../components/CodeBlock.vue'
import MetaTable from '../components/MetaTable.vue'

const demoModules = import.meta.glob<{ default: Component }>('../directive-demos/*.vue')
const demoSources = import.meta.glob('../directive-demos/*.vue', {
  query: '?raw',
  import: 'default',
})

const { t } = useI18n()
const route = useRoute()

const name = computed(() => route.params.name as string)
const content = computed(() => directivesContent[name.value])

// vTooltip -> VTooltipDemo.vue, same transform ComposablePage.vue uses.
const demoFileKey = computed(() => {
  const n = name.value
  return `../directive-demos/${n.charAt(0).toUpperCase()}${n.slice(1)}Demo.vue`
})

// Cached per demo file — defineAsyncComponent(loader) creates a NEW component
// definition every call, so re-deriving this on each computed re-evaluation
// would make Vue treat it as a different component on every render.
const demoComponentCache = new Map<string, Component>()
const DemoComponent = computed<Component | undefined>(() => {
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
watchEffect(async () => {
  const loader = demoSources[demoFileKey.value]
  exampleCode.value = loader ? ((await loader()) as string) : ''
})

const installCode = computed(() => {
  const names = content.value?.installNames ?? [name.value]
  return `import { ${names.join(', ')} } from 'vael-ui'`
})

useHead({ title: () => content.value?.label ?? name.value })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: content.value?.label ?? name.value, url: `https://vael-ui.dev/directives/${name.value}` },
])
</script>

<style scoped>
.directive-page {
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

.directive-page h1 {
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

.directive-demo {
  display: flex;
  padding: 2rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  background: var(--ui-surface);
  margin-bottom: 1rem;
}
</style>
