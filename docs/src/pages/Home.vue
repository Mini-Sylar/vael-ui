<template>
  <div class="home">
    <section class="hero">
      <div class="hero-copy">
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
      </div>

      <div class="hero-showcase" aria-hidden="true">
        <DashboardHero />
      </div>
    </section>

    <section class="features">
      <article class="feature feature--wide">
        <PhLightning :size="20" class="feature-icon" />
        <div>
          <h2>{{ t('home.featureVaporTitle') }}</h2>
          <p>{{ t('home.featureVaporBody') }}</p>
        </div>
      </article>
      <article class="feature">
        <PhSparkle :size="20" class="feature-icon" />
        <div>
          <h2>{{ t('home.featureAnimationTitle') }}</h2>
          <p>{{ t('home.featureAnimationBody') }}</p>
        </div>
      </article>
      <article class="feature">
        <PhGlobe :size="20" class="feature-icon" />
        <div>
          <h2>{{ t('home.featureI18nTitle') }}</h2>
          <p>{{ t('home.featureI18nBody') }}</p>
        </div>
      </article>
      <article class="feature feature--wide">
        <PhPuzzlePiece :size="20" class="feature-icon" />
        <div>
          <h2>{{ t('home.featurePrimitivesTitle') }}</h2>
          <p>{{ t('home.featurePrimitivesBody') }}</p>
        </div>
      </article>
      <article class="feature feature--wide">
        <PhHardDrives :size="20" class="feature-icon" />
        <div>
          <h2>{{ t('home.featureSsrTitle') }}</h2>
          <p>{{ t('home.featureSsrBody') }}</p>
        </div>
      </article>
      <RouterLink to="/docs/guides/skill" class="feature feature-link">
        <PhRobot :size="20" class="feature-icon" />
        <div>
          <h2>{{ t('home.featureSkillTitle') }}</h2>
          <p>{{ t('home.featureSkillBody') }}</p>
        </div>
      </RouterLink>
    </section>

    <section class="closing">
      <RouterLink to="/components/Button" class="cta-link">
        <Button variant="secondary">{{ t('home.browseComponents') }}</Button>
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button, SplitButton } from 'vael-ui'
import type { MenuItemData } from 'vael-ui'
import {
  PhGlobe,
  PhHardDrives,
  PhLightning,
  PhPuzzlePiece,
  PhRobot,
  PhSparkle,
} from '@phosphor-icons/vue'
import DashboardHero from '../components/dashboard/DashboardHero.vue'

const { t } = useI18n()
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
  display: grid;
  grid-template-columns: minmax(0, 22rem) minmax(0, 1fr);
  gap: 3rem;
  align-items: center;
  min-block-size: 34rem;
  padding-block-start: 1rem;
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

.cta-link {
  text-decoration: none;
}

.hero-showcase {
  block-size: 34rem;
  min-inline-size: 0;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-muted);
}

.feature--wide {
  grid-column: span 2;
}

.feature-link {
  text-decoration: none;
  color: inherit;
  transition: border-color var(--ui-duration-press) ease;
}

.feature-link:hover {
  border-color: var(--ui-primary);
}

.feature-icon {
  flex: none;
  margin-block-start: 0.125rem;
  color: var(--ui-primary);
}

.feature h2 {
  margin: 0 0 0.2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.feature p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--ui-text-muted);
}

.closing {
  text-align: center;
  padding-block: 1rem 2rem;
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
}
</style>
