<template>
  <div
    v-if="meta"
    class="component-page-layout"
    :class="{ 'component-page-layout--next': layoutNext }"
  >
    <!-- No username field on a page full of password fields reads to Chrome as a login
         form; it hunts the DOM for a pairing candidate and can land on the header's own
         search box. Standard fix: give it a real one instead. -->
    <input
      v-if="name === 'PasswordInput'"
      type="text"
      name="username"
      autocomplete="username"
      style="display: none"
      aria-hidden="true"
      tabindex="-1"
    />
    <article class="component-page">
      <div class="page-head">
        <p class="eyebrow">{{ category }}</p>
        <!-- Lets readers keep the previous layout if they prefer it. -->
        <div class="layout-compare">
          <span>Layout</span>
          <SelectButton
            v-model="layoutChoice"
            size="sm"
            :items="LAYOUT_ITEMS"
            :allow-empty="false"
            aria-label="Page layout"
          />
        </div>
      </div>
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
        <TimelinePlayground v-else-if="name === 'Timeline'" />
        <PropsPlayground v-else :name="name" />
      </section>

      <section v-if="examples.length > 0" id="examples" class="section">
        <h2>{{ t('component.examples') }}</h2>
        <DemoFrame :name="name" :examples="examples" />
      </section>

      <MotionTable v-if="motionInfo" :name="name" :info="motionInfo" />

      <MetaTable
        id="props"
        :title="t('component.props')"
        :rows="meta.props"
        kind="props"
        :empty-text="t('component.noProps')"
        :type-link="
          motionInfo
            ? { prop: 'motion', href: '#motion', tip: motionInfo.doc.replace(/`/g, '') }
            : undefined
        "
        show-default
      />
      <MetaTable
        id="slots"
        :title="t('component.slots')"
        :rows="meta.slots"
        kind="slots"
        :empty-text="t('component.noSlots')"
      />
      <MetaTable
        id="events"
        :title="t('component.events')"
        :rows="meta.events"
        kind="events"
        :empty-text="t('component.noEvents')"
      />
      <MetaTable
        id="exposed"
        :title="t('component.exposed')"
        :rows="meta.exposed"
        kind="exposed"
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
          kind="props"
          :empty-text="t('component.noProps')"
          show-default
        />
        <MetaTable
          :title="t('component.slots')"
          :rows="related.meta.slots"
          kind="slots"
          :empty-text="t('component.noSlots')"
        />
        <MetaTable
          :title="t('component.exposed')"
          :rows="related.meta.exposed"
          kind="exposed"
          :empty-text="t('component.noExposed')"
        />
      </section>

      <section
        v-for="paired in pairedSections"
        :id="paired.id"
        :key="paired.id"
        class="section related"
      >
        <p class="eyebrow">{{ t('component.headless') }}</p>
        <h2>{{ paired.name }}</h2>
        <p class="description"><RichText :text="paired.description" /></p>
        <CodeBlock lang="typescript" :code="paired.installCode" />
        <CodeBlock
          v-if="paired.exampleCode"
          :lang="paired.exampleLang"
          :code="paired.exampleCode"
          class="paired-example"
        />
        <MetaTable
          :id="`${paired.id}-parameters`"
          :title="t('composable.parameters')"
          :rows="paired.params"
          :empty-text="t('composable.noParameters')"
        />
        <MetaTable
          :id="`${paired.id}-returns`"
          :title="t('composable.returns')"
          :rows="paired.returns"
          :empty-text="t('composable.noReturns')"
        />
      </section>
      <DocsPager />
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
import { SelectButton } from 'vael-ui'
import { layoutNext } from '../layoutNext'
import componentMeta from '../generated/component-meta.json'
import demoManifest from '../generated/demo-manifest.json'
import DemoFrame from '../components/DemoFrame.vue'
import MetaTable from '../components/MetaTable.vue'
import MotionTable from '../components/MotionTable.vue'
import type { MotionInfo } from '../components/MotionTable.vue'
import motionMeta from '../generated/motion-meta.json'
import CodeBlock from '../components/CodeBlock.vue'
import RichText from '../components/RichText.vue'
import DocsPager from '../components/DocsPager.vue'
import OnThisPage from '../components/OnThisPage.vue'
import PropsPlayground from '../playground/PropsPlayground.vue'
import ConfigProviderPlayground from '../playground/ConfigProviderPlayground.vue'
import ToasterPlayground from '../playground/ToasterPlayground.vue'
import TimelinePlayground from '../playground/TimelinePlayground.vue'
import type { ComponentMetaEntry, DemoManifestEntry } from '../types'
import { categoryOf } from '../taxonomy'
import { pairedComposables } from '../pairedComposables'
import { defaultVariant } from '../preferences'
import { useBreadcrumbSchema } from '../composables/useBreadcrumbSchema'
import type { DemoExample } from '../components/DemoFrame.vue'

// `**` (not `*`) because a migrated component's examples live one directory
// deeper — `vdom-demos/Sortable/DragToReorder.vue` — while a not-yet-migrated
// one is still flat — `vdom-demos/DataTableDemo.vue`. Both match either way.
const vdomModules = import.meta.glob<{ default: Component }>('../generated/vdom-demos/**/*.vue')
const vaporModules = import.meta.glob<{ default: Component }>('../generated/vapor-demos/**/*.vue')
const vdomSources = import.meta.glob('../generated/vdom-demos/**/*.vue', {
  query: '?raw',
  import: 'default',
})
const vaporSources = import.meta.glob('../generated/vapor-demos/**/*.vue', {
  query: '?raw',
  import: 'default',
})

const { t, te } = useI18n()

const LAYOUT_ITEMS = [
  { label: 'Current', value: 'current' },
  { label: 'Next', value: 'next' },
]
const layoutChoice = computed({
  get: () => (layoutNext.value ? 'next' : 'current'),
  set: (v: string) => (layoutNext.value = v === 'next'),
})
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

// Per-component callouts for the handful that need one.
const PAGE_NOTE_COMPONENTS = ['Resizable', 'ContextMenu', 'Tree', 'DataTable']
const note = computed(() => {
  if (!PAGE_NOTE_COMPONENTS.includes(name.value)) return null
  return t(`pageNotes.${name.value}`)
})
const typedMeta = componentMeta as Record<string, ComponentMetaEntry>
const motionInfo = computed(() => (motionMeta as Record<string, MotionInfo>)[name.value])
const meta = computed(() => typedMeta[name.value])

// Sub-components that only render inside a specific parent (Column needs
// DataTable, AccordionItem needs Accordion) are documented here instead of
// getting their own sidebar entry and a page that can't show anything live.
const RELATED: Record<string, string[]> = {
  DataTable: ['Column'],
  Accordion: ['AccordionItem'],
  Breadcrumb: ['BreadcrumbItem', 'BreadcrumbSeparator'],
}
const relatedComponents = computed(() =>
  (RELATED[name.value] ?? []).map((n) => ({
    name: n,
    description: describe(n),
    meta: typedMeta[n],
  })),
)
// The headless composable behind this component, documented here rather than
// as a separate composables page.
const pairedSections = computed(() =>
  (pairedComposables[name.value] ?? []).map((paired) => ({
    ...paired,
    id: `composable-${paired.name.replace(/[^\w]+/g, '-')}`,
    installCode: `import { ${(paired.installNames ?? [paired.name]).join(', ')} } from 'vael-ui'`,
    exampleLang: paired.exampleCode?.trimStart().startsWith('<')
      ? ('vue' as const)
      : ('typescript' as const),
  })),
)
const manifestEntry = computed(
  () => (demoManifest as Record<string, DemoManifestEntry>)[name.value],
)
const installCode = computed(() => {
  const pkg = defaultVariant.value === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  return `import { ${name.value} } from '${pkg}'`
})

// Cached per example id (already a unique path, e.g. "Sortable/DragToReorder"
// or "DataTableDemo" for a not-yet-migrated component) so a revisit reuses
// the already-resolved async component instead of a fresh loading gap.
const vdomComponentCache = new Map<string, Component>()
const vaporComponentCache = new Map<string, Component>()

// Demo files carry their own explanatory prose/headings for this site's Examples section, neither
// of which is something a reader copying the code snippet wants — strip them from the shown source.
function stripDemoProse(source: string): string {
  return source
    .replace(/[ \t]*<p class="note">[\s\S]*?<\/p>\n?/g, '')
    .replace(/[ \t]*<h[23]>[\s\S]*?<\/h[23]>\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
}

const examples = shallowRef<DemoExample[]>([])
watchEffect(async (onCleanup) => {
  const manifestExamples = manifestEntry.value?.examples ?? []
  // A newer component's examples may resolve after an older one's; only the
  // latest run may write. Without this, a slow load can overwrite the page
  // you navigated to with the one you left.
  let stale = false
  onCleanup(() => (stale = true))
  const loaded = await Promise.all(
    manifestExamples.map(async (entry) => {
      const vdomLoader = vdomModules[`../generated/vdom-demos/${entry.id}.vue`]
      const vaporLoader = entry.vaporEligible
        ? vaporModules[`../generated/vapor-demos/${entry.id}.vue`]
        : undefined

      let vdomComponent = vdomComponentCache.get(entry.id) ?? null
      if (!vdomComponent && vdomLoader) {
        vdomComponent = defineAsyncComponent(vdomLoader)
        vdomComponentCache.set(entry.id, vdomComponent)
      }
      let vaporComponent = vaporComponentCache.get(entry.id) ?? null
      if (!vaporComponent && vaporLoader) {
        vaporComponent = defineAsyncComponent(vaporLoader)
        vaporComponentCache.set(entry.id, vaporComponent)
      }

      const vdomSourceLoader = vdomSources[`../generated/vdom-demos/${entry.id}.vue`]
      const vaporSourceLoader = entry.vaporEligible
        ? vaporSources[`../generated/vapor-demos/${entry.id}.vue`]
        : undefined
      const vdomCode = vdomSourceLoader ? stripDemoProse((await vdomSourceLoader()) as string) : ''
      const vaporCode = vaporSourceLoader
        ? stripDemoProse((await vaporSourceLoader()) as string)
        : ''

      // The showpieces lead, without the label that marked them.
      const highlight = /^extreme\b/i.test(entry.title)
      return {
        id: entry.id,
        title: highlight
          ? entry.title.replace(/^extreme:?\s*/i, '').replace(/^./, (c) => c.toUpperCase())
          : entry.title,
        highlight,
        vdomComponent,
        vaporComponent,
        vdomCode,
        vaporCode,
      }
    }),
  )
  if (!stale)
    examples.value = [...loaded.filter((e) => e.highlight), ...loaded.filter((e) => !e.highlight)]
})

const tocLinks = computed(() => [
  { id: 'install', label: t('component.install') },
  { id: 'playground', label: t('component.playground') },
  ...(examples.value.length > 0
    ? [
        {
          id: 'examples',
          label: t('component.examples'),
          children:
            examples.value.length > 1
              ? examples.value.map((example) => ({
                  id: `example-${example.id.split('/').pop()!.replace(/^\d+-/, '')}`,
                  label: example.title,
                }))
              : undefined,
        },
      ]
    : []),
  ...(motionInfo.value ? [{ id: 'motion', label: t('component.motion'), isNew: true }] : []),
  { id: 'props', label: t('component.props') },
  { id: 'slots', label: t('component.slots') },
  { id: 'events', label: t('component.events') },
  { id: 'exposed', label: t('component.exposed') },
  ...relatedComponents.value.map((r) => ({ id: `related-${r.name}`, label: r.name })),
  ...pairedSections.value.map((p) => ({ id: p.id, label: p.name })),
])
</script>

<style scoped>
.component-page-layout {
  display: grid;
  grid-template-columns: minmax(0, 46rem) 13rem;
  justify-content: center;
  gap: 4rem;
  align-items: start;
}

.component-page {
  min-width: 0;
}

/* Grows with the screen: the playground, examples and tables all use the
   width, while running text keeps its own reading measure. */
.component-page-layout--next {
  grid-template-columns: minmax(0, 1fr) 13rem;
  max-inline-size: 124rem;
  margin-inline: auto;
  gap: 3rem;
}

.component-page-layout--next .description,
.component-page-layout--next .page-note {
  max-inline-size: 46rem;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.35rem;
}

.page-head .eyebrow {
  margin-bottom: 0;
}

.layout-compare {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ui-text-muted);
}

/* Pill all the way down: the sliding indicator reads its radius from this var. */
.layout-compare :deep(.ui-select-button) {
  --ui-select-button-radius: 999px;
}

.layout-compare :deep(.ui-select-button-option) {
  border-radius: 999px;
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

.related .eyebrow {
  margin-bottom: 0.25rem;
}

.paired-example {
  margin-top: 1rem;
}
</style>
