<template>
  <GuideLayout :links="[]" wide>
    <h1>{{ t('motionDocs.showcase.title') }}</h1>
    <p class="lede">{{ t('motionDocs.showcase.intro', { count: pieces.length }) }}</p>

    <SelectButton
      v-model="engine"
      :allow-empty="false"
      size="sm"
      :aria-label="t('motionDocs.showcase.engine')"
      :items="ENGINES.map((id) => ({ label: t(`motionDocs.showcase.engines.${id}`), value: id }))"
    />
    <div class="sc-grid">
      <article
        v-for="piece in shown"
        :key="piece.id"
        :ref="(el) => watchCard(el as HTMLElement | null, piece.id)"
        class="sc-card"
        :class="{ 'sc-card--wide': WIDE.has(piece.component) }"
      >
        <header class="sc-head">
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
          <span class="sc-engine" :data-engine="piece.engine">{{
            t(`motionDocs.showcase.engines.${piece.engine}`)
          }}</span>
        </header>
        <p class="sc-title">{{ piece.title }}</p>
        <!-- Mounted once it comes near the screen, then kept: 37 live demos at once would be heavy. -->
        <div class="sc-stage demo-preview">
          <component :is="componentFor(piece)" v-if="near.has(piece.id)" />
        </div>
      </article>
    </div>

    <!-- The next step up: whole screens built from these pieces. -->
    <section id="blocks" class="sc-blocks">
      <DitherBackground class="sc-blocks-dither" still />
      <div class="sc-blocks-text">
        <h2>{{ t('motionDocs.showcase.blocksTitle') }}</h2>
        <p>{{ t('motionDocs.showcase.blocksBody') }}</p>
      </div>
      <Button as="a" :href="BLOCKS_URL" target="_blank" rel="noopener" variant="outline">
        {{ BLOCKS_URL.replace('https://', '') }}
        <template #trailing><PhArrowUpRight :size="14" aria-hidden="true" /></template>
      </Button>
    </section>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onScopeDispose, shallowRef, triggerRef } from 'vue'
import type { Component } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { PhArrowUpRight } from '@phosphor-icons/vue'
import { Button, SelectButton } from 'vael-ui'
import DitherBackground from '../../components/DitherBackground.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import { componentIcons } from '../../componentIcons'
import demoManifest from '../../generated/demo-manifest.json'
import { defaultVariant } from '../../preferences'

const { t } = useI18n()
useHead({ title: () => t('motionDocs.showcase.title') })

// Not live yet; one place to change it.
const BLOCKS_URL = 'https://blocks.vael-ui.dev'

const ENGINES = ['all', 'builtin', 'gsap', 'motion'] as const
type Engine = Exclude<(typeof ENGINES)[number], 'all'>
interface Piece {
  id: string
  component: string
  anchor: string
  title: string
  engine: Engine
  vapor: boolean
}

// Every component's showpieces, from the same manifest its page uses.
const manifest = demoManifest as Record<
  string,
  { examples: { id: string; title: string; vaporEligible?: boolean }[] }
>
const pieces: Piece[] = Object.entries(manifest)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([component, entry]) =>
    entry.examples
      .filter((example) => /^extreme\b/i.test(example.title))
      .map((example) => {
        const file = example.id.split('/').pop()!
        return {
          id: example.id,
          component,
          anchor: `example-${file.replace(/^\d+-/, '')}`,
          title: example.title
            .replace(/^extreme:?\s*/i, '')
            .replace(/\s*\((gsap|motion-v|motion)\)\s*$/i, '')
            .replace(/^./, (c) => c.toUpperCase()),
          engine: /gsap/i.test(file) ? 'gsap' : /motionv/i.test(file) ? 'motion' : 'builtin',
          vapor: !!example.vaporEligible,
        }
      }),
  )

// Showpieces that need more room than one card: they span two.
const WIDE = new Set([
  'Calendar',
  'DatePicker',
  'ColorPicker',
  'Dock',
  'Pagination',
  'Select',
  'Stepper',
])

const engine = shallowRef<(typeof ENGINES)[number]>('all')
const shown = computed(() =>
  engine.value === 'all' ? pieces : pieces.filter((piece) => piece.engine === engine.value),
)

const vdomModules = import.meta.glob<{ default: Component }>('../../generated/vdom-demos/**/*.vue')
const vaporModules = import.meta.glob<{ default: Component }>(
  '../../generated/vapor-demos/**/*.vue',
)
const loaded = new Map<string, Component>()
function componentFor(piece: Piece): Component | null {
  const vapor = defaultVariant.value === 'vapor' && piece.vapor
  const key = `${vapor ? 'vapor' : 'vdom'}:${piece.id}`
  let component = loaded.get(key)
  if (!component) {
    const loader = (vapor ? vaporModules : vdomModules)[
      `../../generated/${vapor ? 'vapor' : 'vdom'}-demos/${piece.id}.vue`
    ]
    if (!loader) return null
    component = defineAsyncComponent(loader)
    loaded.set(key, component)
  }
  return component
}

// Which cards are near the screen: they mount then, and stay.
const near = shallowRef(new Set<string>())
const observer =
  typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver(
        (entries) => {
          let added = false
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.piece
            if (!entry.isIntersecting || !id || near.value.has(id)) continue
            near.value.add(id)
            observer?.unobserve(entry.target)
            added = true
          }
          if (added) triggerRef(near)
        },
        { rootMargin: '400px 0px' },
      )
function watchCard(el: HTMLElement | null, id: string) {
  if (!el || near.value.has(id)) return
  el.dataset.piece = id
  observer?.observe(el)
}
onScopeDispose(() => observer?.disconnect())
</script>

<style scoped>
.lede {
  max-inline-size: 38rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}
.sc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 21rem), 1fr));
  grid-auto-flow: dense;
  gap: 1rem;
  margin-block: 1rem 3rem;
}
.sc-card {
  display: grid;
  grid-template-rows: auto auto 1fr;
  min-inline-size: 0;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  background: var(--ui-surface);
}
.sc-card--wide {
  grid-column: span 2;
}
@media (max-width: 760px) {
  .sc-card--wide {
    grid-column: auto;
  }
}
.sc-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0;
  font-size: 0.875rem;
  font-weight: 600;
}
.sc-head a {
  color: var(--ui-text);
  text-decoration: none;
}
@media (hover: hover) and (pointer: fine) {
  .sc-head a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}
.sc-engine {
  margin-inline-start: auto;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--ui-muted);
  color: var(--ui-text-muted);
  font-size: 0.6875rem;
  font-weight: 500;
}
.sc-engine[data-engine='builtin'] {
  background: color-mix(in oklch, var(--docs-accent, var(--ui-info)) 12%, transparent);
  color: color-mix(in oklch, var(--docs-accent, var(--ui-info)) 75%, var(--ui-text));
}
.sc-title {
  margin: 0.25rem 0 0;
  padding-inline: 1rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
/* The demo's own heading and notes stay hidden, as on its page. */
.sc-stage {
  display: grid;
  align-content: center;
  min-block-size: 14rem;
  padding: 1.5rem 1rem;
  overflow: hidden;
}
.sc-stage :deep(.demo > h3:first-of-type) {
  display: none;
}

/* ─── Blocks ─── */
.sc-blocks {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 2rem;
  padding: 2rem;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  isolation: isolate;
}
.sc-blocks-dither {
  --dither-alpha: 0.08;
  z-index: -1;
  mask-image: radial-gradient(ellipse 70% 120% at 100% 50%, #000 20%, transparent 75%);
}
.sc-blocks-text h2 {
  margin: 0 0 0.35rem;
}
.sc-blocks-text p {
  margin: 0;
  max-inline-size: 32rem;
  color: var(--ui-text-muted);
}
</style>
