<template>
  <GuideLayout v-if="chapter" :links="tocLinks">
    <p class="mc-eyebrow">{{ t('motionDocs.chapters.eyebrow', { n: number, total }) }}</p>
    <h1>{{ t(`motionDocs.chapters.${chapter.id}.title`) }}</h1>
    <p class="mc-lede" v-html="t(`motionDocs.chapters.${chapter.id}.intro`)" />

    <section v-for="section in chapter.sections" :key="section.id" class="mc-section">
      <h2 :id="section.id">
        {{ t(`motionDocs.chapters.${chapter.id}.${section.id}.title`) }}
      </h2>
      <p v-html="t(`motionDocs.chapters.${chapter.id}.${section.id}.body`)" />
      <ul v-if="items(section.id).length" class="mc-list">
        <li v-for="(item, i) in items(section.id)" :key="i" v-html="item" />
      </ul>
      <CodeBlock v-if="section.code" :code="section.code" />
      <MotionDemo v-if="section.demo" :id="section.demo" />
    </section>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import GuideLayout from '../../components/GuideLayout.vue'
import MotionDemo from '../../components/MotionDemo.vue'
import CodeBlock from '../../components/CodeBlock.vue'
import { MOTION_CHAPTERS } from '../../motionChapters'

const { t, tm, rt } = useI18n()
const route = useRoute()
const chapter = computed(() => MOTION_CHAPTERS.find((c) => c.routeName === route.name))
const number = computed(() => MOTION_CHAPTERS.indexOf(chapter.value!) + 1)
const total = MOTION_CHAPTERS.length
useHead({ title: () => (chapter.value ? t(`motionDocs.chapters.${chapter.value.id}.title`) : '') })

// A section may carry a short list (`items`), such as the moments `after` understands.
const items = (sectionId: string): string[] => {
  const raw = tm(`motionDocs.chapters.${chapter.value!.id}.${sectionId}.items`) as unknown
  return Array.isArray(raw) ? raw.map((item) => rt(item)) : []
}

const tocLinks = computed(() =>
  (chapter.value?.sections ?? []).map((section) => ({
    id: section.id,
    label: t(`motionDocs.chapters.${chapter.value!.id}.${section.id}.title`),
  })),
)
</script>

<style scoped>
.mc-eyebrow {
  margin: 0 0 0.25rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.mc-lede {
  max-inline-size: 38rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}
.mc-section {
  margin-block-start: 2.5rem;
}
.mc-list {
  display: grid;
  gap: 0.35rem;
  padding-inline-start: 1.25rem;
}
</style>
