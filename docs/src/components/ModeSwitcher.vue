<template>
  <Menu :items="items" class="mode-switcher" @select="(item) => (mode = item.value as DocsMode)">
    <template #trigger="{ open }">
      <Button variant="outline" size="sm" block class="mode-trigger" :data-open="open || undefined">
        <template #leading>
          <component :is="current.icon" :size="16" aria-hidden="true" />
        </template>
        {{ current.label }}
        <template #trailing>
          <PhCaretUpDown :size="14" aria-hidden="true" />
        </template>
      </Button>
    </template>
    <template #item="{ item }">
      <span class="mode-item">
        <component :is="item.icon" :size="18" aria-hidden="true" />
        <span class="mode-text">
          <span>{{ item.label }}</span>
          <span class="mode-description">{{ item.description }}</span>
        </span>
        <PhCheck v-if="item.value === mode" :size="14" class="mode-check" aria-hidden="true" />
      </span>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhCaretUpDown, PhCheck, PhFunction, PhSquaresFour, PhWaveSine } from '@phosphor-icons/vue'
import { Button, Menu } from 'vael-ui'
import type { DocsMode } from '../docsNav'

// What the sidebar lists: components, composables or motion, each with what you'll find there.
const mode = defineModel<DocsMode>({ required: true })
const { t } = useI18n()

const items = computed(() => [
  {
    label: t('nav.components'),
    value: 'components',
    icon: PhSquaresFour,
    description: t('motionDocs.mode.components'),
  },
  {
    label: t('nav.composables'),
    value: 'composables',
    icon: PhFunction,
    description: t('motionDocs.mode.composables'),
  },
  {
    label: t('motionDocs.nav.motion'),
    value: 'motion',
    icon: PhWaveSine,
    description: t('motionDocs.mode.motion'),
  },
])
const current = computed(() => items.value.find((item) => item.value === mode.value)!)
</script>

<style scoped>
.mode-switcher {
  inline-size: 100%;
}
.mode-trigger {
  justify-content: flex-start;
}
/* The caret sits at the far end: the contents fill the trigger. */
.mode-trigger :deep(.ui-button-inner) {
  flex: 1;
  justify-content: flex-start;
}
.mode-trigger :deep(.ui-button-trailing) {
  margin-inline-start: auto;
  color: var(--ui-text-muted);
}
.mode-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  inline-size: 100%;
}
.mode-text {
  display: grid;
  line-height: 1.3;
}
.mode-description {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.mode-check {
  margin-inline-start: auto;
  color: var(--ui-primary);
}
</style>
