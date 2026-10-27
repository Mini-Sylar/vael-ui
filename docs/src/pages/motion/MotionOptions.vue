<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('motionDocs.options.title') }}</h1>
    <p class="lede">{{ t('motionDocs.options.intro') }}</p>
    <Input
      v-model="query"
      class="mo-filter"
      clearable
      :placeholder="t('motionDocs.options.filter')"
      :aria-label="t('motionDocs.options.filter')"
    />
    <template v-if="shown.length">
      <section v-for="group in shown" :key="group.id" class="mo-group">
        <h2 :id="`group-${group.id}`">{{ t(`motionDocs.options.groups.${group.id}`) }}</h2>
        <!-- Coloured as inline code is across the docs: names in the accent, calls as code. -->
        <dl class="mo-list">
          <div v-for="option in group.options" :key="option.name" class="mo-row">
            <dt>
              <code>{{ option.name }}</code>
            </dt>
            <dd>
              <RouterLink
                v-for="place in option.places"
                :key="place.key"
                :to="{ name: place.routeName, hash: `#${place.section}` }"
                class="mo-link"
                ><span class="mo-title">{{ place.title }}</span>
                <span class="mo-chapter">· {{ place.chapter }}</span></RouterLink
              >
            </dd>
          </div>
        </dl>
      </section>
    </template>
    <p v-else class="mo-empty">{{ t('motionDocs.options.empty') }}</p>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { Input } from 'vael-ui'
import GuideLayout from '../../components/GuideLayout.vue'
import { MOTION_CHAPTERS, OPTION_GROUPS, SECTION_OPTIONS } from '../../motionChapters'

const { t } = useI18n()
useHead({ title: () => t('motionDocs.options.title') })

interface Place {
  key: string
  routeName: string
  section: string
  title: string
  chapter: string
}

// Each section's options turned around: every option, with the sections that teach it.
const options = computed(() => {
  const byName = new Map<string, Place[]>()
  for (const chapter of MOTION_CHAPTERS)
    for (const section of chapter.sections)
      for (const name of SECTION_OPTIONS[`${chapter.id}.${section.id}`] ?? [])
        byName.set(name, [
          ...(byName.get(name) ?? []),
          {
            key: `${chapter.id}.${section.id}`,
            routeName: chapter.routeName,
            section: section.id,
            title: t(`motionDocs.chapters.${chapter.id}.${section.id}.title`),
            chapter: t(`motionDocs.chapters.${chapter.id}.title`),
          },
        ])
  return byName
})

// By what you're trying to do, A to Z within each; an option no group names lands in Other.
// Sorted by the word itself: `.size` under s, `v-animate:name` under v.
const word = (name: string) => name.replace(/^[^a-z]+/i, '').toLowerCase()
const groups = computed(() => {
  const grouped = new Set(OPTION_GROUPS.flatMap((group) => group.options))
  const all = [
    ...OPTION_GROUPS,
    { id: 'other', options: [...options.value.keys()].filter((name) => !grouped.has(name)) },
  ]
  return all.map((group) => ({
    id: group.id,
    options: group.options
      .filter((name) => options.value.has(name))
      .map((name) => ({ name, places: options.value.get(name)! }))
      .sort((a, b) => word(a.name).localeCompare(word(b.name))),
  }))
})

const query = shallowRef('')
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return groups.value
    .map((group) => ({
      ...group,
      options: q
        ? group.options.filter((option) => option.name.toLowerCase().includes(q))
        : group.options,
    }))
    .filter((group) => group.options.length)
})
// Prefixed, so a group's id never matches another element's on the page (`app` is Vue's root).
const tocLinks = computed(() =>
  shown.value.map((group) => ({
    id: `group-${group.id}`,
    label: t(`motionDocs.options.groups.${group.id}`),
  })),
)
</script>

<style scoped>
.mo-filter {
  max-inline-size: 20rem;
  margin-block: 1rem 0.5rem;
}
.mo-group h2 {
  margin-block: 2rem 0.5rem;
}
.mo-list {
  display: grid;
  margin: 0;
}
.mo-row {
  display: grid;
  grid-template-columns: minmax(8rem, 12rem) 1fr;
  gap: 0.25rem 1rem;
  padding-block: 0.625rem;
  border-block-end: 1px solid var(--ui-border);
}
.mo-row dt code {
  font-size: 0.875rem;
}
.mo-row dd {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin: 0;
}
/* Read at a glance in both themes: the section in the text colour, underlined only on hover; the
   chapter quieter and never underlined, so no line runs through grey text. */
.mo-link {
  color: var(--ui-text);
  text-decoration: none;
  border-radius: 4px;
}
.mo-link:hover .mo-title {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.mo-link:focus-visible {
  outline: 2px solid var(--ui-ring, var(--ui-primary));
  outline-offset: 2px;
}
.mo-chapter {
  /* The gap the template's whitespace would give, which the compiler drops between the spans. */
  margin-inline-start: 0.3em;
  color: var(--ui-text-muted);
}
.mo-empty {
  color: var(--ui-text-muted);
}
@media (max-width: 640px) {
  .mo-row {
    grid-template-columns: 1fr;
  }
}
</style>
