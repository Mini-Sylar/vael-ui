<template>
  <GuideLayout :links="tocLinks">
    <header class="forms-hero">
      <DitherBackground class="forms-hero-dither" />
      <!-- Three fields settling in, the last one checked: a form that's done. -->
      <div class="forms-hero-art" aria-hidden="true">
        <span v-for="n in 3" :key="n" v-animate:forms-hero="art" class="forms-hero-field">
          <span class="forms-hero-label" :style="{ inlineSize: `${[38, 54, 30][n - 1]}%` }" />
          <span class="forms-hero-input">
            <PhCheck v-if="n === 3" :size="12" weight="bold" class="forms-hero-check" />
          </span>
        </span>
      </div>
      <div class="forms-hero-text">
        <p class="eyebrow">{{ t('formsDocs.eyebrow') }}</p>
        <h1>{{ t('formsDocs.title') }}</h1>
        <p class="lede" v-html="t('formsDocs.lede')" />
      </div>
    </header>

    <h2 id="install">{{ t('formsDocs.install') }}</h2>
    <p>{{ t('formsDocs.installBody') }}</p>
    <CodeBlock lang="bash" code="pnpm add vael-form zod" />

    <h2 id="quick">{{ t('formsDocs.quickTitle') }}</h2>
    <p v-html="t('formsDocs.quickBody')" />
    <FormDemo id="start/01-SignUp" />

    <h2 id="why">{{ t('formsDocs.why.title') }}</h2>
    <ul class="forms-why">
      <li v-for="(item, i) in why" :key="i" v-html="item" />
    </ul>

    <h2 id="tour">{{ t('formsDocs.tourTitle') }}</h2>
    <div class="forms-cards">
      <RouterLink
        v-for="(chapter, i) in FORMS_CHAPTERS"
        :key="chapter.id"
        :to="{ name: chapter.routeName }"
        class="forms-card"
      >
        <span class="forms-card-number">{{ String(i + 1).padStart(2, '0') }}</span>
        <strong>{{ t(`formsDocs.chapters.${chapter.id}.title`) }}</strong>
        <span>{{ t(`formsDocs.card.${chapter.id}`) }}</span>
      </RouterLink>
    </div>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { PhCheck } from '@phosphor-icons/vue'
import { vAnimate } from 'vael-ui/motion'
import CodeBlock from '../../components/CodeBlock.vue'
import DitherBackground from '../../components/DitherBackground.vue'
import FormDemo from '../../components/FormDemo.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import { FORMS_CHAPTERS } from '../../formsChapters'
import { useBreadcrumbSchema } from '../../composables/useBreadcrumbSchema'

const { t, tm, rt } = useI18n()
useHead({ title: () => t('formsDocs.title') })
useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('formsDocs.title'), url: 'https://vael-ui.dev/forms' },
])

// The fields rise in one after another, once per visit.
const art = { initial: { opacity: 0, y: 6 }, duration: 260, easing: 'out', stagger: 0.07 } as const

const why = computed(() =>
  (tm('formsDocs.why.items') as unknown[]).map((item) => rt(item as never)),
)

const tocLinks = computed(() => [
  { id: 'install', label: t('formsDocs.install') },
  { id: 'quick', label: t('formsDocs.quickTitle') },
  { id: 'why', label: t('formsDocs.why.title') },
  { id: 'tour', label: t('formsDocs.tourTitle') },
])
</script>

<style scoped>
/* The dither feathers out below and to the sides, so the hero blends into the page. */
.forms-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2rem;
  margin: -1rem -1.5rem 2rem;
  padding: 2.5rem 1.5rem;
  isolation: isolate;
}
.forms-hero-dither {
  --dither-alpha: 0.07;
  mask-image: radial-gradient(ellipse 80% 90% at 30% 40%, #000 30%, transparent 75%);
}
.forms-hero-art,
.forms-hero-text {
  position: relative;
  z-index: 1;
}
.forms-hero-art {
  display: grid;
  gap: 0.625rem;
  flex: none;
  inline-size: 8.25rem;
  padding: 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  background: var(--ui-surface);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.06);
}
.forms-hero-field {
  display: grid;
  gap: 0.3rem;
}
.forms-hero-label {
  block-size: 0.3125rem;
  border-radius: 999px;
  background: var(--ui-border-strong, var(--ui-border));
}
.forms-hero-input {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  block-size: 1.125rem;
  padding-inline: 0.3rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) - 2px);
}
.forms-hero-check {
  color: var(--ui-primary);
}
.forms-hero h1 {
  margin: 0.15rem 0 0.5rem;
}
.lede {
  margin: 0;
  max-inline-size: 34rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}
.forms-why {
  display: grid;
  gap: 0.5rem;
  padding-inline-start: 1.25rem;
}
.forms-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.75rem;
  margin-block-end: 2rem;
}
.forms-card {
  display: grid;
  align-content: start;
  gap: 0.35rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  color: var(--ui-text);
  text-decoration: none;
  transition: border-color var(--ui-duration-press) var(--ui-ease-out);
}
.forms-card-number {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.forms-card > span:last-child {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
@media (hover: hover) and (pointer: fine) {
  .forms-card:hover {
    border-color: var(--ui-border-strong, var(--ui-text-muted));
  }
}
@media (max-width: 640px) {
  .forms-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
