<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('skill.title') }}</h1>
    <p v-html="t('skill.intro')" />

    <h2 id="skills">{{ t('skill.skillsTitle') }}</h2>
    <p>{{ t('skill.skillsIntro') }}</p>
    <dl class="skill-list">
      <div v-for="skill in skills" :key="skill.name" class="skill-row">
        <dt>
          <code>{{ skill.name }}</code>
        </dt>
        <dd>{{ t(`skill.${skill.body}`) }}</dd>
      </div>
    </dl>

    <h2 id="claude-code">{{ t('skill.claudeCodeTitle') }}</h2>
    <p>{{ t('skill.claudeCodeIntro') }}</p>
    <CodeBlock
      lang="bash"
      code="/plugin marketplace add Mini-Sylar/vael-ui-skills
/plugin install vael-ui@vael-ui-skills
/plugin install vael-form@vael-ui-skills"
    />

    <h2 id="other-agents">{{ t('skill.otherAgentsTitle') }}</h2>
    <p v-html="t('skill.otherAgentsIntro')" />
    <SelectButton
      v-model="packageManager"
      size="sm"
      :allow-empty="false"
      :items="packageManagers.map((item) => ({ label: item, value: item }))"
      class="pm-toggle"
    />
    <CodeBlock lang="bash" :code="skillsAddCode" />
    <p>{{ t('skill.otherAgentsPick') }}</p>
    <CodeBlock lang="bash" :code="skillsAddNamedCode" />

    <h2 id="whats-included">{{ t('skill.whatsIncludedTitle') }}</h2>
    <p>{{ t('skill.whatsIncludedIntro') }}</p>
    <ul>
      <li>{{ t('skill.includedComponents') }}</li>
      <li>{{ t('skill.includedComposables') }}</li>
      <li>{{ t('skill.includedAnimation') }}</li>
      <li>{{ t('skill.includedStyling') }}</li>
      <li>{{ t('skill.includedForms') }}</li>
    </ul>

    <h2 id="source">{{ t('skill.sourceTitle') }}</h2>
    <i18n-t keypath="skill.sourceIntro" tag="p" scope="global">
      <template #link>
        <a href="https://github.com/Mini-Sylar/vael-ui-skills" target="_blank" rel="noreferrer"
          >Mini-Sylar/vael-ui-skills</a
        >
      </template>
    </i18n-t>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { SelectButton } from 'vael-ui'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import { useBreadcrumbSchema } from '../../composables/useBreadcrumbSchema'
import { packageManager, packageManagers } from '../../preferences'

const { t } = useI18n()
useHead({ title: () => t('skill.title') })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('skill.title'), url: 'https://vael-ui.dev/docs/guides/skill' },
])

const SKILLS_ADD_COMMANDS: Record<(typeof packageManagers)[number], string> = {
  npm: 'npx skills add Mini-Sylar/vael-ui-skills',
  pnpm: 'pnpm dlx skills add Mini-Sylar/vael-ui-skills',
  yarn: 'yarn dlx skills add Mini-Sylar/vael-ui-skills',
  bun: 'bunx skills add Mini-Sylar/vael-ui-skills',
}
const skillsAddCode = computed(() => SKILLS_ADD_COMMANDS[packageManager.value])
const skills = [
  { name: 'vael-ui', body: 'uiBody' },
  { name: 'vael-motion', body: 'motionBody' },
  { name: 'vael-form', body: 'formBody' },
]
const skillsAddNamedCode = computed(() =>
  skills
    .map((skill) => `${SKILLS_ADD_COMMANDS[packageManager.value]} --skill ${skill.name}`)
    .join('\n'),
)

const tocLinks = computed(() => [
  { id: 'skills', label: t('skill.skillsTitle') },
  { id: 'claude-code', label: t('skill.claudeCodeTitle') },
  { id: 'other-agents', label: t('skill.otherAgentsTitle') },
  { id: 'whats-included', label: t('skill.whatsIncludedTitle') },
  { id: 'source', label: t('skill.sourceTitle') },
])
</script>

<style scoped>
.pm-toggle {
  margin-bottom: 0.75rem;
}
.skill-list {
  display: grid;
  margin: 0 0 1.5rem;
}
.skill-row {
  display: grid;
  grid-template-columns: minmax(7rem, 9rem) 1fr;
  gap: 0.25rem 1rem;
  padding-block: 0.75rem;
  border-block-end: 1px solid var(--ui-border);
}
.skill-row dd {
  margin: 0;
  line-height: 1.6;
}
@media (max-width: 640px) {
  .skill-row {
    grid-template-columns: 1fr;
  }
}
</style>
