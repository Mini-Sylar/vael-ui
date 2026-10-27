<template>
  <GuideLayout :links="[]" wide>
    <h1>{{ t('motionDocs.blocks.title') }}</h1>
    <p class="lede">{{ t('motionDocs.blocks.intro') }}</p>

    <div class="bl-grid">
      <article v-for="block in BLOCKS" :id="block" :key="block" class="bl-block">
        <h2>{{ t(`motionDocs.blocks.items.${block}.title`) }}</h2>
        <p>{{ t(`motionDocs.blocks.items.${block}.body`) }}</p>
        <MotionDemo :id="`showcase/${block}`" />
      </article>
    </div>

    <!-- The site that will hold them isn't live yet: said, not linked. -->
    <section class="bl-coming">
      <DitherBackground class="bl-coming-dither" still />
      <h2>{{ t('motionDocs.blocks.comingTitle') }}</h2>
      <p>{{ t('motionDocs.blocks.comingBody') }}</p>
    </section>
  </GuideLayout>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import DitherBackground from '../../components/DitherBackground.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import MotionDemo from '../../components/MotionDemo.vue'
import { BLOCKS } from '../../motionBlocks'

const { t } = useI18n()
useHead({ title: () => t('motionDocs.blocks.title') })
</script>

<style scoped>
.lede {
  max-inline-size: 40rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}
.bl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 30rem), 1fr));
  gap: 2rem 1.5rem;
  margin-block: 2rem 3rem;
}
.bl-block {
  min-inline-size: 0;
}
.bl-block h2 {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
}
.bl-block > p {
  margin: 0 0 0.75rem;
  color: var(--ui-text-muted);
  font-size: 0.9375rem;
}
.bl-coming {
  position: relative;
  padding: 2rem;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  isolation: isolate;
}
.bl-coming-dither {
  --dither-alpha: 0.08;
  z-index: -1;
  mask-image: radial-gradient(ellipse 70% 120% at 100% 50%, #000 20%, transparent 75%);
}
.bl-coming h2 {
  margin: 0 0 0.35rem;
}
.bl-coming p {
  margin: 0;
  max-inline-size: 34rem;
  color: var(--ui-text-muted);
}
</style>
