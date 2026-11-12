<template>
  <GuideLayout v-if="chapter" :links="tocLinks">
    <p class="fc-eyebrow">{{ t('formsDocs.chapters.eyebrow', { n: number, total }) }}</p>
    <h1>{{ t(`formsDocs.chapters.${chapter.id}.title`) }}</h1>
    <p class="fc-lede" v-html="t(`formsDocs.chapters.${chapter.id}.intro`)" />

    <section v-for="section in chapter.sections" :key="section.id" class="fc-section">
      <h2 :id="section.id">
        {{ t(`formsDocs.chapters.${chapter.id}.${section.id}.title`) }}
        <!-- The API it teaches, so a page can be scanned for a name such as showErrors. -->
        <span v-if="SECTION_APIS[`${chapter.id}.${section.id}`]" class="fc-apis">
          <RouterLink
            v-for="name in SECTION_APIS[`${chapter.id}.${section.id}`]"
            :key="name"
            :to="{ name: 'forms-api', hash: `#${apiAnchor(name)}` }"
            class="fc-api"
          >
            <code>{{ name }}</code>
          </RouterLink>
        </span>
      </h2>
      <p v-html="t(`formsDocs.chapters.${chapter.id}.${section.id}.body`)" />
      <ul v-if="items(section.id).length" class="fc-list">
        <li v-for="(item, i) in items(section.id)" :key="i" v-html="item" />
      </ul>
      <CodeBlock v-if="section.code" :lang="langOf(section.code)" :code="section.code" />
      <CodeBlock
        v-if="chapter.id === 'i18n' && section.id === 'catalog'"
        lang="json"
        :code="catalog"
      />
      <FormDemo v-if="section.demo" :id="section.demo" />
    </section>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import GuideLayout from '../../components/GuideLayout.vue'
import FormDemo from '../../components/FormDemo.vue'
import CodeBlock from '../../components/CodeBlock.vue'
import { FORMS_CHAPTERS, SECTION_APIS, apiAnchor } from '../../formsChapters'
import en from '../../locales/en.json'

const { t, tm, rt } = useI18n()
const route = useRoute()
const chapter = computed(() => FORMS_CHAPTERS.find((c) => c.routeName === route.name))
const number = computed(() => FORMS_CHAPTERS.indexOf(chapter.value!) + 1)
const total = FORMS_CHAPTERS.length
useHead({ title: () => (chapter.value ? t(`formsDocs.chapters.${chapter.value.id}.title`) : '') })

const langOf = (code: string) =>
  code.startsWith('pnpm ') ? 'bash' : code.trimStart().startsWith('<') ? 'vue' : 'typescript'

// The catalog to copy is the docs' own English one: the demos on these pages use it.
const catalog = JSON.stringify({ formKit: en.formKit }, null, 2)

// A section may carry a short list (`items`).
const items = (sectionId: string): string[] => {
  const raw = tm(`formsDocs.chapters.${chapter.value!.id}.${sectionId}.items`) as unknown
  return Array.isArray(raw) ? raw.map((item) => rt(item)) : []
}

const tocLinks = computed(() =>
  (chapter.value?.sections ?? []).map((section) => ({
    id: section.id,
    label: t(`formsDocs.chapters.${chapter.value!.id}.${section.id}.title`),
  })),
)
</script>

<style scoped>
/* Beside the heading, quieter than it: the API names, wrapping under it when they don't fit. */
.fc-apis {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-inline-start: 0.5rem;
  vertical-align: middle;
}
.fc-api {
  display: inline-flex;
  text-decoration: none;
}
.fc-api code {
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  background: var(--ui-muted);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
}
.fc-api:hover code {
  color: var(--ui-text);
  background: var(--ui-border);
}
.fc-eyebrow {
  margin: 0 0 0.25rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.fc-lede {
  max-inline-size: 38rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}
.fc-section {
  margin-block-start: 2.5rem;
}
.fc-list {
  display: grid;
  gap: 0.35rem;
  margin-block-end: 1.25rem;
  padding-inline-start: 1.25rem;
}
</style>
