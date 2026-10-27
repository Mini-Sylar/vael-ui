<template>
  <GuideLayout :links="[]" wide>
    <h1>{{ t('motionDocs.showpieces.title') }}</h1>
    <p class="lede">{{ t('motionDocs.showpieces.intro') }}</p>
    <SelectButton
      v-model="engine"
      :allow-empty="false"
      size="sm"
      :aria-label="t('motionDocs.showpieces.filter')"
      :items="ENGINES.map((id) => ({ label: engineLabel(id), value: id }))"
    />

    <article
      v-for="piece in shown"
      :id="piece.anchor"
      :key="piece.id"
      :ref="(el) => watchRow(el as HTMLElement | null, piece.id)"
      class="sp-row"
    >
      <header class="sp-head">
        <component
          :is="componentIcons[piece.component]"
          v-if="componentIcons[piece.component]"
          :size="16"
          aria-hidden="true"
        />
        <RouterLink
          :to="{ name: 'component', params: { name: piece.component }, hash: `#${piece.anchor}` }"
        >
          {{ piece.component }}
        </RouterLink>
        <span class="sp-title">{{ piece.title }}</span>
      </header>
      <div class="sp-pair">
        <section class="sp-side">
          <p class="sp-label">
            {{ t('motionDocs.showpieces.with', { engine: engineLabel(piece.engine) }) }}
          </p>
          <DemoExampleBlock
            v-if="near.has(piece.id) && examples[piece.original]"
            :name="piece.component"
            :example="examples[piece.original]!"
            :show-title="false"
          />
        </section>
        <section class="sp-side">
          <p class="sp-label">{{ t('motionDocs.showpieces.vael') }}</p>
          <template v-if="near.has(piece.id)">
            <DemoExampleBlock
              v-if="piece.parity && examples[piece.parity]"
              :name="piece.component"
              :example="examples[piece.parity]!"
              :show-title="false"
            />
            <p v-else-if="!piece.parity" class="sp-none">{{ t('motionDocs.showpieces.none') }}</p>
          </template>
        </section>
      </div>
    </article>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onScopeDispose, shallowReactive, shallowRef } from 'vue'
import type { Component } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { SelectButton } from 'vael-ui'
import GuideLayout from '../../components/GuideLayout.vue'
import DemoExampleBlock from '../../components/DemoExampleBlock.vue'
import type { DemoExample } from '../../components/DemoFrame.vue'
import { componentIcons } from '../../componentIcons'
import demoManifest from '../../generated/demo-manifest.json'

const { t } = useI18n()
useHead({ title: () => t('motionDocs.showpieces.title') })

// Every showpiece as it was first built, with GSAP, motion or vael-ui's built-in look, beside the
// same piece on vael-ui's own motion, each with its code.
const ENGINES = ['all', 'gsap', 'motion', 'builtin'] as const
type Engine = (typeof ENGINES)[number]
const engineLabel = (id: Engine) =>
  id === 'all'
    ? t('motionDocs.showpieces.all')
    : id === 'gsap'
      ? 'GSAP'
      : id === 'motion'
        ? 'motion'
        : t('motionDocs.showpieces.builtin')

const originals = import.meta.glob<{ default: Component }>('../../demos/**/*.vue')
const originalSources = import.meta.glob<string>('../../demos/**/*.vue', {
  query: '?raw',
  import: 'default',
})
const parities = import.meta.glob<{ default: Component }>('../../motion-parity/**/*.vue')
const paritySources = import.meta.glob<string>('../../motion-parity/**/*.vue', {
  query: '?raw',
  import: 'default',
})

interface Piece {
  id: string
  component: string
  anchor: string
  title: string
  engine: Exclude<Engine, 'all'>
  original: string
  parity?: string
}

const manifest = demoManifest as Record<string, { examples: { id: string; title: string }[] }>
const pieces: Piece[] = Object.entries(manifest)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([component, entry]) =>
    entry.examples
      .filter((example) => /^extreme\b/i.test(example.title))
      .map((example): Piece => {
        const [folder, file] = example.id.split('/') as [string, string]
        const prefix = file.match(/^\d+-/)?.[0] ?? ''
        // Its vael-ui version: same folder, same number.
        const parity = Object.keys(parities).find((path) =>
          path.startsWith(`../../motion-parity/${folder}/${prefix}`),
        )
        return {
          id: example.id,
          component,
          anchor: `example-${file.replace(/^\d+-/, '')}`,
          title: example.title
            .replace(/^extreme:?\s*/i, '')
            .replace(/\s*\((gsap|motion-v|motion)\)\s*$/i, '')
            .replace(/^./, (c) => c.toUpperCase()),
          engine: /gsap/i.test(file) ? 'gsap' : /motionv/i.test(file) ? 'motion' : 'builtin',
          original: `../../demos/${example.id}.vue`,
          parity,
        }
      }),
  )

const engine = shallowRef<Engine>('all')
const shown = computed(() =>
  engine.value === 'all' ? pieces : pieces.filter((piece) => piece.engine === engine.value),
)

// The heading and maintainer notes stay out of the code you copy.
const strip = (source: string) =>
  source
    .replace(/[ \t]*<p class="note">[\s\S]*?<\/p>\n?/g, '')
    .replace(/[ \t]*<h[23]>[\s\S]*?<\/h[23]>\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')

// Each side's example, built once its row comes near the screen.
const examples = shallowReactive<Record<string, DemoExample>>({})
async function build(path: string | undefined) {
  if (!path || examples[path]) return
  const load = originals[path] ?? parities[path]
  const source = originalSources[path] ?? paritySources[path]
  if (!load || !source) return
  examples[path] = {
    id: path.replace(/^\.\.\/\.\.\//, '').replace(/\.vue$/, ''),
    title: '',
    vdomComponent: defineAsyncComponent(load),
    vaporComponent: null,
    vdomCode: strip(await source()),
    vaporCode: '',
  }
}

// Rows mount as they come near the screen, then stay.
const near = shallowReactive(new Set<string>())
const observer =
  typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.piece
            if (!entry.isIntersecting || !id || near.has(id)) continue
            const piece = pieces.find((each) => each.id === id)
            near.add(id)
            void build(piece?.original)
            void build(piece?.parity)
            observer?.unobserve(entry.target)
          }
        },
        { rootMargin: '400px 0px' },
      )
function watchRow(el: HTMLElement | null, id: string) {
  if (!el || near.has(id)) return
  el.dataset.piece = id
  observer?.observe(el)
}
onScopeDispose(() => observer?.disconnect())
</script>

<style scoped>
.lede {
  max-inline-size: 44rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}
.sp-row {
  margin-block-start: 2rem;
  padding-block-start: 1.25rem;
  border-block-start: 1px solid var(--ui-border);
  scroll-margin-block-start: 5rem;
}
.sp-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 0.75rem;
  font-weight: 600;
}
.sp-head a {
  color: var(--ui-text);
}
.sp-title {
  color: var(--ui-text-muted);
  font-weight: 400;
}
.sp-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.sp-side {
  min-inline-size: 0;
}
.sp-label {
  margin: 0 0 0.4rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}
.sp-none {
  margin: 0;
  color: var(--ui-text-muted);
}
@media (max-width: 900px) {
  .sp-pair {
    grid-template-columns: 1fr;
  }
}
</style>
