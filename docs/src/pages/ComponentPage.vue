<template>
  <div v-if="meta" class="component-page-layout">
    <article class="component-page">
      <p v-if="category" class="eyebrow">{{ category }}</p>
      <h1>{{ name }}</h1>
      <p v-if="description" class="description">{{ description }}</p>
      <p v-if="note" class="page-note">{{ note }}</p>

      <section id="install" class="install">
        <h2>{{ t('component.install') }}</h2>
        <CodeBlock lang="typescript" :code="installCode" />
      </section>

      <section id="playground" class="section">
        <h2>{{ t('component.playground') }}</h2>
        <ConfigProviderPlayground v-if="name === 'ConfigProvider'" />
        <ToasterPlayground v-else-if="name === 'Toaster'" />
        <PropsPlayground v-else :name="name" />
      </section>

      <section v-if="manifestEntry?.demo" id="examples" class="section">
        <h2>{{ t('component.examples') }}</h2>
        <DemoFrame
          :name="name"
          :vdom-component="vdomComponent"
          :vapor-component="vaporComponent"
          :vdom-code="vdomCode"
          :vapor-code="vaporCode"
        />
      </section>

      <MetaTable
        id="props"
        :title="t('component.props')"
        :rows="meta.props"
        :empty-text="t('component.noProps')"
        show-default
      />
      <MetaTable
        id="slots"
        :title="t('component.slots')"
        :rows="meta.slots"
        :empty-text="t('component.noSlots')"
      />
      <MetaTable
        id="events"
        :title="t('component.events')"
        :rows="meta.events"
        :empty-text="t('component.noEvents')"
      />
      <MetaTable
        id="exposed"
        :title="t('component.exposed')"
        :rows="meta.exposed"
        :empty-text="t('component.noExposed')"
      />

      <section
        v-for="related in relatedComponents"
        :id="`related-${related.name}`"
        :key="related.name"
        class="section related"
      >
        <h2>{{ related.name }}</h2>
        <p v-if="related.description" class="description">{{ related.description }}</p>
        <MetaTable
          :title="t('component.props')"
          :rows="related.meta.props"
          :empty-text="t('component.noProps')"
          show-default
        />
        <MetaTable
          :title="t('component.slots')"
          :rows="related.meta.slots"
          :empty-text="t('component.noSlots')"
        />
        <MetaTable
          :title="t('component.exposed')"
          :rows="related.meta.exposed"
          :empty-text="t('component.noExposed')"
        />
      </section>
    </article>
    <OnThisPage :links="tocLinks" />
  </div>
  <p v-else>{{ t('component.notFound', { name }) }}</p>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, watchEffect, type Component } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import componentMeta from '../generated/component-meta.json'
import demoManifest from '../generated/demo-manifest.json'
import DemoFrame from '../components/DemoFrame.vue'
import MetaTable from '../components/MetaTable.vue'
import CodeBlock from '../components/CodeBlock.vue'
import OnThisPage from '../components/OnThisPage.vue'
import PropsPlayground from '../playground/PropsPlayground.vue'
import ConfigProviderPlayground from '../playground/ConfigProviderPlayground.vue'
import ToasterPlayground from '../playground/ToasterPlayground.vue'
import type { ComponentMetaEntry, DemoManifestEntry } from '../types'
import { categoryOf } from '../taxonomy'
import { defaultVariant } from '../preferences'
import { useBreadcrumbSchema } from '../composables/useBreadcrumbSchema'

const vdomModules = import.meta.glob<{ default: Component }>('../generated/vdom-demos/*.vue')
const vaporModules = import.meta.glob<{ default: Component }>('../generated/vapor-demos/*.vue')
const vdomSources = import.meta.glob('../generated/vdom-demos/*.vue', {
  query: '?raw',
  import: 'default',
})
const vaporSources = import.meta.glob('../generated/vapor-demos/*.vue', {
  query: '?raw',
  import: 'default',
})

const { t, te } = useI18n()
const route = useRoute()

function describe(componentName: string): string | null {
  const key = `descriptions.${componentName}`
  return te(key) ? t(key) : null
}

const name = computed(() => route.params.name as string)
const category = computed(() => {
  const key = categoryOf(name.value)
  return key ? t(`taxonomy.${key}`) : undefined
})
const description = computed(() => describe(name.value))

useHead({
  title: () => name.value,
  meta: [{ name: 'description', content: () => description.value ?? undefined }],
})

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: name.value, url: `https://vael-ui.dev/components/${name.value}` },
])

// Per-component callouts for the handful that need one, currently just
// pointing Resizable at its real, already-in-use example instead of a
// canned demo.
const PAGE_NOTE_COMPONENTS = ['Resizable']
const note = computed(() => {
  if (!PAGE_NOTE_COMPONENTS.includes(name.value)) return null
  return t(`pageNotes.${name.value}`)
})
const typedMeta = componentMeta as Record<string, ComponentMetaEntry>
const meta = computed(() => typedMeta[name.value])

// Sub-components that only render inside a specific parent (Column needs
// DataTable, AccordionItem needs Accordion) are documented here instead of
// getting their own sidebar entry and a page that can't show anything live.
const RELATED: Record<string, string[]> = {
  DataTable: ['Column'],
  Accordion: ['AccordionItem'],
}
const relatedComponents = computed(() =>
  (RELATED[name.value] ?? []).map((n) => ({
    name: n,
    description: describe(n),
    meta: typedMeta[n],
  })),
)
const manifestEntry = computed(
  () => (demoManifest as Record<string, DemoManifestEntry>)[name.value],
)
const installCode = computed(() => {
  const pkg = defaultVariant.value === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  return `import { ${name.value} } from '${pkg}'`
})

// Cached per demo name so a revisit reuses the already-resolved async component instead of a fresh loading gap.
const vdomComponentCache = new Map<string, Component>()
const vaporComponentCache = new Map<string, Component>()

const vdomComponent = computed(() => {
  const demo = manifestEntry.value?.demo
  if (!demo) return null
  const loader = vdomModules[`../generated/vdom-demos/${demo}.vue`]
  if (!loader) return null
  let cached = vdomComponentCache.get(demo)
  if (!cached) {
    cached = defineAsyncComponent(loader)
    vdomComponentCache.set(demo, cached)
  }
  return cached
})

const vaporComponent = computed(() => {
  const demo = manifestEntry.value?.demo
  if (!demo || !manifestEntry.value?.vaporEligible) return null
  const loader = vaporModules[`../generated/vapor-demos/${demo}.vue`]
  if (!loader) return null
  let cached = vaporComponentCache.get(demo)
  if (!cached) {
    cached = defineAsyncComponent(loader)
    vaporComponentCache.set(demo, cached)
  }
  return cached
})

// Demo files carry their own explanatory prose/headings for this site's Examples section, neither
// of which is something a reader copying the code snippet wants — strip them from the shown source.
function stripDemoProse(source: string): string {
  return source
    .replace(/[ \t]*<p class="note">[\s\S]*?<\/p>\n?/g, '')
    .replace(/[ \t]*<h[23]>[\s\S]*?<\/h[23]>\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
}

function useDemoSource(modules: Record<string, () => Promise<unknown>>, dir: string) {
  const source = shallowRef('')
  watchEffect(async () => {
    const demo = manifestEntry.value?.demo
    const loader = demo ? modules[`../generated/${dir}/${demo}.vue`] : undefined
    if (!loader) {
      source.value = ''
      return
    }
    const mod = await loader()
    source.value = stripDemoProse(mod as string)
  })
  return source
}

const vdomCode = useDemoSource(vdomSources, 'vdom-demos')
const vaporCode = useDemoSource(vaporSources, 'vapor-demos')

const tocLinks = computed(() => [
  { id: 'install', label: t('component.install') },
  { id: 'playground', label: t('component.playground') },
  ...(manifestEntry.value?.demo ? [{ id: 'examples', label: t('component.examples') }] : []),
  { id: 'props', label: t('component.props') },
  { id: 'slots', label: t('component.slots') },
  { id: 'events', label: t('component.events') },
  { id: 'exposed', label: t('component.exposed') },
  ...relatedComponents.value.map((r) => ({ id: `related-${r.name}`, label: r.name })),
])
</script>

<style scoped>
.component-page-layout {
  display: grid;
  grid-template-columns: minmax(0, 46rem) 1fr;
  gap: 4rem;
  align-items: start;
}

.component-page {
  min-width: 0;
}

@media (max-width: 1100px) {
  .component-page-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ui-text-muted);
  margin-bottom: 0.35rem;
}

.component-page h1 {
  font-size: 2rem;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.description {
  font-size: 1rem;
  color: var(--ui-text-muted);
  margin-bottom: 0.5rem;
}

.page-note {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

.install,
.section {
  margin-top: 1.25rem;
  margin-bottom: 2.75rem;
  scroll-margin-top: calc(var(--docs-header-height) + 1.5rem);
}

.install h2,
.section h2 {
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  margin-bottom: 0.75rem;
}

.related {
  padding-top: 2rem;
  border-top: 1px solid var(--ui-border);
}

.related h2 {
  font-size: 1.3rem;
  letter-spacing: -0.015em;
}
</style>
