<template>
  <div class="home">
    <section class="hero">
      <div class="hero-copy">
        <a class="news-pill" :href="CHANGELOG_URL" target="_blank" rel="noreferrer">
          <span class="news-pill-tag">{{ t('home.newTag') }}</span>
          <span>{{ t('home.newText') }}</span>
          <PhArrowRight :size="12" aria-hidden="true" />
        </a>
        <p class="eyebrow">{{ t('home.eyebrow') }}</p>
        <h1 class="headline">{{ t('home.headline') }}</h1>
        <p class="tagline">{{ t('home.tagline') }}</p>
        <div class="hero-actions">
          <RouterLink to="/docs/getting-started" class="cta-link">
            <Button size="lg">{{ t('nav.gettingStarted') }}</Button>
          </RouterLink>
          <SplitButton size="lg" variant="outline" :items="githubMenuItems" @click="openGithub">
            {{ t('nav.github') }}
          </SplitButton>
        </div>
        <div class="hero-theme">
          <span class="hero-theme-label">{{ t('home.themeLabel') }}</span>
          <ThemeSwatches />
        </div>
      </div>

      <div class="hero-showcase" role="region" :aria-label="t('home.showcaseLabel')">
        <ShowcaseStage />
      </div>
    </section>

    <section ref="features" class="features" :data-reveal="reveal === 'none' ? undefined : reveal">
      <FeatureCard
        class="feature--wide"
        :icon="PhLightning"
        :title="t('home.featureVaporTitle')"
        :body="t('home.featureVaporBody')"
      >
        <template #visual><VaporVisual /></template>
      </FeatureCard>
      <FeatureCard
        :icon="PhSparkle"
        :title="t('home.featureAnimationTitle')"
        :body="t('home.featureAnimationBody')"
      >
        <template #visual><AnimationVisual /></template>
      </FeatureCard>
      <FeatureCard
        :icon="PhGlobe"
        :title="t('home.featureI18nTitle')"
        :body="t('home.featureI18nBody')"
      >
        <template #visual><I18nVisual /></template>
      </FeatureCard>
      <FeatureCard
        class="feature--wide"
        :icon="PhPuzzlePiece"
        :title="t('home.featurePrimitivesTitle')"
        :body="t('home.featurePrimitivesBody')"
      >
        <template #visual><PrimitivesVisual /></template>
      </FeatureCard>
      <FeatureCard
        class="feature--wide"
        :icon="PhHardDrives"
        :title="t('home.featureSsrTitle')"
        :body="t('home.featureSsrBody')"
      >
        <template #visual>
          <TerminalVisual
            command="vite-ssg build"
            :output="['pages rendered on the server', 'hydrated in the browser']"
          />
        </template>
      </FeatureCard>
      <FeatureCard
        to="/docs/guides/skill"
        :icon="PhRobot"
        :title="t('home.featureSkillTitle')"
        :body="t('home.featureSkillBody')"
      >
        <template #visual>
          <TerminalVisual
            command="npx skills add Mini-Sylar/vael-ui-skills"
            :output="['vael-ui skill installed']"
          />
        </template>
      </FeatureCard>
    </section>

    <section class="closing">
      <div class="closing-actions">
        <RouterLink to="/components/Button" class="cta-link">
          <Button size="lg">{{ t('home.browseComponents') }}</Button>
        </RouterLink>
        <RouterLink to="/docs/getting-started" class="cta-link">
          <Button size="lg" variant="outline">{{ t('nav.gettingStarted') }}</Button>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button, SplitButton } from 'vael-ui'
import type { MenuItemData } from 'vael-ui'
import {
  PhArrowRight,
  PhGlobe,
  PhHardDrives,
  PhLightning,
  PhPuzzlePiece,
  PhRobot,
  PhSparkle,
} from '@phosphor-icons/vue'
import ShowcaseStage from '../components/dashboard/ShowcaseStage.vue'
import FeatureCard from '../components/home/FeatureCard.vue'
import VaporVisual from '../components/home/VaporVisual.vue'
import AnimationVisual from '../components/home/AnimationVisual.vue'
import I18nVisual from '../components/home/I18nVisual.vue'
import PrimitivesVisual from '../components/home/PrimitivesVisual.vue'
import TerminalVisual from '../components/home/TerminalVisual.vue'

// Lazy: it pulls in motion, which the rest of the page doesn't need up front.
const ThemeSwatches = defineAsyncComponent(() => import('../components/ThemeSwatches.vue'))

const { t } = useI18n()

const CHANGELOG_URL = 'https://github.com/Mini-Sylar/vael-ui/blob/main/packages/ui/CHANGELOG.md'

// The bento staggers in once as it scrolls into view. It only arms (hides)
// when it starts below the fold, so server-rendered HTML, no-JS visitors and
// a section already on screen never see hidden cards.
const features = useTemplateRef<HTMLElement>('features')
const reveal = shallowRef<'none' | 'armed' | 'shown'>('none')
let revealObserver: IntersectionObserver | undefined
onBeforeUnmount(() => revealObserver?.disconnect())
onMounted(() => {
  const el = features.value
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (el.getBoundingClientRect().top < window.innerHeight) return
  reveal.value = 'armed'
  revealObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      reveal.value = 'shown'
      revealObserver?.disconnect()
    },
    { threshold: 0.15 },
  )
  revealObserver.observe(el)
})
const router = useRouter()

function openGithub() {
  window.open('https://github.com/Mini-Sylar/vael-ui', '_blank', 'noreferrer')
}

const githubMenuItems = computed<MenuItemData[]>(() => [
  {
    label: t('home.featureSkillTitle'),
    icon: PhRobot,
    onSelect: () => router.push('/docs/guides/skill'),
  },
])
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 5rem;
  padding-block-end: 3rem;
}

.hero {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 24rem) minmax(0, 1fr);
  gap: 2rem;
  align-items: center;
  min-block-size: 34rem;
  padding-block-start: 1rem;
}

/* A dot grid that fades out toward the edges, with a soft glow behind the
   showcase in the chosen theme color (neutral until one is picked). */
.hero::before,
.hero::after {
  content: '';
  position: absolute;
  z-index: -1;
  pointer-events: none;
}

.hero::before {
  inset: -2rem -3rem;
  background: radial-gradient(
      color-mix(in oklch, var(--ui-text) 10%, transparent) 1px,
      transparent 1px
    )
    0 0 / 18px 18px;
  mask-image: radial-gradient(ellipse 70% 65% at 60% 45%, black 20%, transparent 75%);
}

.hero::after {
  inset: 5% -5% 5% 35%;
  background: radial-gradient(
    closest-side,
    color-mix(in oklch, var(--docs-accent, var(--ui-text)) 16%, transparent),
    transparent
  );
  filter: blur(8px);
  transition: background 400ms var(--ui-ease-out);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ui-primary);
}

.headline {
  margin: 0;
  font-size: clamp(2.25rem, 4vw, 3rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.tagline {
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
  max-inline-size: 30rem;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-block-start: 0.5rem;
}

.hero-theme {
  /* Holds the lazily loaded swatch row's height so nothing shifts when it lands. */
  min-block-size: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-block-start: 0.75rem;
}

.hero-theme-label {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}

.cta-link {
  text-decoration: none;
}

.hero-showcase {
  block-size: 34rem;
  min-inline-size: 0;
}

/* The dashboard rises in once on first load; later visits and reduced
   motion show it in place. */
@media (prefers-reduced-motion: no-preference) {
  .hero-showcase {
    animation: showcase-in 700ms var(--ui-ease-out) both;
    animation-delay: 120ms;
  }
}

@keyframes showcase-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.985);
  }
}

.news-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-start;
  padding: 0.25rem 0.65rem 0.25rem 0.3rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
  text-decoration: none;
  background: var(--ui-surface);
  box-shadow: 0 0 0 1px var(--ui-border);
  transition:
    color var(--ui-duration-press) var(--ui-ease-out),
    box-shadow var(--ui-duration-press) var(--ui-ease-out);
}

.news-pill:hover {
  color: var(--ui-text);
  box-shadow: 0 0 0 1px
    color-mix(in oklch, var(--docs-accent, var(--ui-text)) 45%, var(--ui-border));
}

.news-pill:focus-visible {
  outline: 2px solid var(--ui-text);
  outline-offset: 3px;
}

.news-pill-tag {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ui-primary-contrast);
  background: var(--ui-primary);
}

.features {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.feature--wide {
  grid-column: span 2;
}

.features[data-reveal] > * {
  transition:
    opacity 500ms var(--ui-ease-out),
    transform 500ms var(--ui-ease-out);
}

.features[data-reveal='armed'] > * {
  opacity: 0;
  transform: translateY(14px);
}

.features[data-reveal] > :nth-child(2) {
  transition-delay: 70ms;
}
.features[data-reveal] > :nth-child(3) {
  transition-delay: 140ms;
}
.features[data-reveal] > :nth-child(4) {
  transition-delay: 210ms;
}
.features[data-reveal] > :nth-child(5) {
  transition-delay: 280ms;
}
.features[data-reveal] > :nth-child(6) {
  transition-delay: 350ms;
}

/* A proper ending: both next steps, centered under a soft glow that picks
   up the chosen theme color. */
.closing {
  position: relative;
  display: grid;
  place-items: center;
  padding-block: 3.5rem 2.5rem;
  isolation: isolate;
}

.closing::before {
  content: '';
  position: absolute;
  inset: 0 15%;
  z-index: -1;
  background: radial-gradient(
    closest-side,
    color-mix(in oklch, var(--docs-accent, var(--ui-text)) 12%, transparent),
    transparent
  );
  pointer-events: none;
}

.closing-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    min-block-size: 0;
  }

  .hero-showcase {
    block-size: 28rem;
  }

  .features {
    grid-template-columns: minmax(0, 1fr);
  }

  .feature--wide {
    grid-column: auto;
  }

  .feature--wide {
    grid-column: auto;
  }
}
</style>
