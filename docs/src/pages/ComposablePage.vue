<template>
  <article v-if="content" class="composable-page">
    <p v-if="category" class="eyebrow">{{ category }}</p>
    <h1>{{ name }}</h1>
    <p class="description">{{ description }}</p>

    <section id="install" class="section">
      <h2>{{ t('component.install') }}</h2>
      <CodeBlock lang="typescript" :code="installCode" />
    </section>

    <section id="usage" class="section">
      <h2>{{ t('component.examples') }}</h2>
      <DemoFrame v-if="content.hasLiveDemo" :name="name" :examples="examples" />
      <CodeBlock v-else lang="typescript" :code="exampleCode" />
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
import DemoFrame from '../components/DemoFrame.vue'
import type { DemoExample } from '../components/DemoFrame.vue'

// `**` matches both a legacy flat `UseFooDemo.vue` and a migrated
// `UseFoo/SomeExample.vue` the same way ComponentPage.vue's globs do.
const demoModules = import.meta.glob<{ default: Component }>('../composable-demos/**/*.vue')
const demoSources = import.meta.glob('../composable-demos/**/*.vue', {
  query: '?raw',
  import: 'default',
})

const { t, te } = useI18n()
const route = useRoute()

const name = computed(() => route.params.name as string)
const content = computed(() => composablesContent[name.value])
const category = computed(() => {
  const key = composableCategoryOf(name.value)
  return key ? t(`composablesTaxonomy.${key}`) : undefined
})
const description = computed(() => {
  const key = `composableDescriptions.${name.value}`
  return te(key) ? t(key) : content.value?.description
})

// UseConfirmAction -> UseConfirmAction
const demoBaseName = computed(() => {
  const n = name.value
  return `${n.charAt(0).toUpperCase()}${n.slice(1)}`
})

// A composable's own <h3> is its example title, same convention component
// demos already use.
function extractTitle(source: string, fallback: string): string {
  const match = source.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
  if (!match) return fallback
  return match[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}
function stripDemoProse(source: string): string {
  return source
    .replace(/[ \t]*<p class="note">[\s\S]*?<\/p>\n?/g, '')
    .replace(/[ \t]*<h[23]>[\s\S]*?<\/h[23]>\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
}

// Cached per example id — defineAsyncComponent(loader) creates a NEW
// component definition every call, so re-deriving this on each computed
// re-evaluation would make Vue treat it as a different component on every
// render (same reasoning as ComponentPage.vue's vdom/vapor component cache).
const demoComponentCache = new Map<string, Component>()
const examples = shallowRef<DemoExample[]>([])
watchEffect(async () => {
  if (!content.value?.hasLiveDemo) {
    examples.value = []
    return
  }
  const base = demoBaseName.value
  const folderPrefix = `../composable-demos/${base}/`
  const folderIds = Object.keys(demoModules)
    .filter((k) => k.startsWith(folderPrefix))
    .map((k) => k.slice('../composable-demos/'.length, -'.vue'.length))
    .sort()

  if (folderIds.length > 0) {
    examples.value = await Promise.all(
      folderIds.map(async (id) => {
        const loader = demoModules[`../composable-demos/${id}.vue`]
        let vdomComponent = demoComponentCache.get(id) ?? null
        if (!vdomComponent && loader) {
          vdomComponent = defineAsyncComponent(loader)
          demoComponentCache.set(id, vdomComponent)
        }
        const sourceLoader = demoSources[`../composable-demos/${id}.vue`]
        const rawSource = sourceLoader ? ((await sourceLoader()) as string) : ''
        return {
          id,
          title: extractTitle(rawSource, id.split('/').at(-1) ?? id),
          vdomComponent,
          vaporComponent: null,
          vdomCode: stripDemoProse(rawSource),
          vaporCode: '',
        }
      }),
    )
    return
  }

  // Not yet migrated: one legacy `${base}Demo.vue`, optionally combined with
  // extraSourceFiles (a dialog body, etc.) into a single example's code view.
  const id = `${base}Demo`
  const loader = demoModules[`../composable-demos/${id}.vue`]
  let vdomComponent = demoComponentCache.get(id) ?? null
  if (!vdomComponent && loader) {
    vdomComponent = defineAsyncComponent(loader)
    demoComponentCache.set(id, vdomComponent)
  }
  const mainLoader = demoSources[`../composable-demos/${id}.vue`]
  const mainSource = mainLoader ? ((await mainLoader()) as string) : ''
  const extraFiles = content.value.extraSourceFiles ?? []
  const extraSources = await Promise.all(
    extraFiles.map(async (file) => {
      const loader = demoSources[`../composable-demos/${file}`]
      const source = loader ? ((await loader()) as string) : ''
      return `<!-- ${file} -->\n${source}`
    }),
  )
  examples.value = [
    {
      id,
      title: extractTitle(mainSource, name.value),
      vdomComponent,
      vaporComponent: null,
      vdomCode: [stripDemoProse(mainSource), ...extraSources].filter(Boolean).join('\n\n'),
      vaporCode: '',
    },
  ]
})

// Only reached when hasLiveDemo is false — a plain TS snippet instead of a
// live .vue example, so Shiki needs the typescript grammar, not vue's.
const exampleCode = computed(() => content.value?.exampleCode ?? '')

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
</style>
