<template>
  <GuideLayout :links="tocLinks">
    <header class="motion-hero">
      <DitherBackground class="motion-hero-dither" />
      <LogoMorph class="motion-hero-logo" :size="132" />
      <div class="motion-hero-text">
        <p class="eyebrow">{{ t('motionDocs.eyebrow') }}</p>
        <h1>{{ t('motionDocs.title') }}</h1>
        <p class="lede" v-html="t('motionDocs.lede')" />
      </div>
    </header>

    <h2 id="tour">{{ t('motionDocs.tourTitle') }}</h2>
    <div class="motion-cards">
      <RouterLink
        v-for="card in cards"
        :key="card.id"
        :to="card.to"
        class="motion-card"
        @pointerenter="replay(card.id)"
      >
        <span class="motion-card-stage" aria-hidden="true">
          <span
            v-for="n in 3"
            :key="`${card.id}-${n}-${plays[card.id] ?? 0}`"
            v-animate:[card.id]="card.look(n)"
            class="motion-card-dot"
          />
        </span>
        <strong>{{ t(`motionDocs.card.${card.id}.title`) }}</strong>
        <span>{{ t(`motionDocs.card.${card.id}.body`) }}</span>
      </RouterLink>
    </div>

    <h2 id="prop">{{ t('motionDocs.propTitle') }}</h2>
    <p v-html="t('motionDocs.propIntro')" />
    <CodeBlock
      code='<Dialog
  v-model:open="open"
  :motion="{
    initial: { panel: { opacity: 0, y: 12, scale: 0.96 } },
    spring: { damping: 0.8, response: 0.4 },
  }"
/>'
    />
    <p v-html="t('motionDocs.propTable')" />

    <h2 id="yours">{{ t('motionDocs.yoursTitle') }}</h2>
    <p v-html="t('motionDocs.yoursIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { vAnimate } from "vael-ui/motion"
&lt;/script&gt;

<template>
  <article v-animate.rise="{ when: &apos;visible&apos; }">
    Rises in the first time it scrolls into view.
  </article>
</template>'
    />
    <p v-html="t('motionDocs.yoursComposables')" />
    <ul class="motion-composables">
      <li v-for="item in composables" :key="item.name">
        <RouterLink :to="item.to"
          ><code>{{ item.name }}</code></RouterLink
        >
        <span>{{ t(`motionDocs.composable.${item.name}`) }}</span>
      </li>
    </ul>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { vAnimate } from 'vael-ui/motion'
import CodeBlock from '../../components/CodeBlock.vue'
import DitherBackground from '../../components/DitherBackground.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import LogoMorph from '../../components/LogoMorph.vue'
import { useBreadcrumbSchema } from '../../composables/useBreadcrumbSchema'

const { t } = useI18n()
useHead({ title: () => t('motionDocs.title') })
useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('motionDocs.title'), url: 'https://vael-ui.dev/motion' },
])

// Each card shows its idea in three dots, played again as you point at it; a card staggers its own.
const plays = reactive<Record<string, number>>({})
const replay = (id: string) => (plays[id] = (plays[id] ?? 0) + 1)
const cards = [
  {
    id: 'blocks',
    to: { name: 'motion-blocks' },
    // A burst: they pop up one after another, with a little overshoot.
    look: () => ({
      initial: { opacity: 0, scale: '0.4' },
      spring: 'bouncy' as const,
      stagger: true,
    }),
  },
  {
    id: 'springs',
    to: { name: 'motion-springs' },
    look: (n: number) => ({
      initial: { y: 18, opacity: 0 },
      spring: { damping: 0.45 + n * 0.15, response: 0.5 },
    }),
  },
  {
    id: 'types',
    to: { name: 'motion-types' },
    // Like characters typed in: one after another, no bounce.
    look: () => ({ initial: { opacity: 0, x: -6 }, duration: 160, stagger: 0.09 }),
  },
  {
    id: 'engines',
    to: { name: 'motion-engines' },
    look: (n: number) => ({ initial: { scale: 0.2, opacity: 0 }, duration: 260 + n * 120 }),
  },
  {
    id: 'guide',
    to: { name: 'guide-animation-integration' },
    look: () => ({ initial: { x: -14, opacity: 0, blur: 4 }, duration: 320, stagger: 0.06 }),
  },
]
const composables = [
  { name: 'springEasing', to: { name: 'composable', params: { name: 'springEasing' } } },
  { name: 'useSpringValue', to: { name: 'composable', params: { name: 'useSpringValue' } } },
  { name: 'useHoverIndicator', to: { name: 'composable', params: { name: 'useHoverIndicator' } } },
  { name: 'useTabIndicator', to: { name: 'composable', params: { name: 'useTabIndicator' } } },
]

const tocLinks = computed(() => [
  { id: 'tour', label: t('motionDocs.tourTitle') },
  { id: 'prop', label: t('motionDocs.propTitle') },
  { id: 'yours', label: t('motionDocs.yoursTitle') },
])
</script>

<style scoped>
/* The dither feathers out below and to the sides, so the hero blends into the page. */
.motion-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2rem;
  margin: -1rem -1.5rem 2rem;
  padding: 2.5rem 1.5rem;
  isolation: isolate;
}
.motion-hero-dither {
  --dither-alpha: 0.07;
  mask-image: radial-gradient(ellipse 80% 90% at 30% 40%, #000 30%, transparent 75%);
}
.motion-hero-logo,
.motion-hero-text {
  position: relative;
  z-index: 1;
}
.motion-hero h1 {
  margin: 0.15rem 0 0.5rem;
}
.lede {
  margin: 0;
  max-inline-size: 34rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}
.motion-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.75rem;
  margin-block-end: 2rem;
}
.motion-card {
  display: grid;
  gap: 0.35rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  color: var(--ui-text);
  text-decoration: none;
  transition: border-color var(--ui-duration-press) var(--ui-ease-out);
}
.motion-card > span:last-child {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
@media (hover: hover) and (pointer: fine) {
  .motion-card:hover {
    border-color: var(--ui-border-strong, var(--ui-text-muted));
  }
}
.motion-card-stage {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  block-size: 2.5rem;
  margin-block-end: 0.35rem;
}
.motion-card-dot {
  inline-size: 0.875rem;
  block-size: 0.875rem;
  border-radius: 50%;
  background: var(--ui-primary);
}
.motion-composables {
  display: grid;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
}
.motion-composables li {
  display: grid;
  grid-template-columns: 11rem 1fr;
  gap: 1rem;
}
@media (max-width: 640px) {
  .motion-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .motion-composables li {
    grid-template-columns: 1fr;
    gap: 0.15rem;
  }
}
</style>
