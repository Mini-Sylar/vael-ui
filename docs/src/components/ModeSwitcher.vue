<template>
  <div class="mode-switcher">
    <Menu :items="items" @select="(item) => pick(item.value as DocsMode)">
      <template #trigger="{ open }">
        <Button variant="outline" block class="mode-trigger" :data-open="open || undefined">
          <template #leading>
            <!-- The icon swaps softly: it shrinks, blurs and fades out as the next one comes in. -->
            <Transition name="mode-icon" mode="out-in">
              <component :is="current.icon" :key="mode" :size="16" aria-hidden="true" />
            </Transition>
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhCaretUpDown, PhCheck, PhFunction, PhSquaresFour, PhWaveSine } from '@phosphor-icons/vue'
import { Button, Menu } from 'vael-ui'
import type { DocsMode } from '../docsNav'

// What the sidebar lists: components, composables or motion, each with what you'll find there.
const mode = defineModel<DocsMode>({ required: true })
// Picked by you (not by landing on a page): the sidebar takes you to that section.
const emit = defineEmits<{ switch: [mode: DocsMode] }>()
function pick(next: DocsMode) {
  mode.value = next
  emit('switch', next)
}
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
  background: var(--ui-surface);
}
/* A faint dither around it, thickest by the icon and feathering out, so it reads as the way in. */
.mode-switcher {
  position: relative;
  isolation: isolate;
}
.mode-switcher::before {
  content: '';
  position: absolute;
  inset: -0.6rem -0.75rem;
  z-index: -1;
  background: radial-gradient(circle, var(--ui-primary) 0.6px, transparent 0.9px) 0 0 / 4px 4px;
  opacity: 0.3;
  mask-image: radial-gradient(ellipse 70% 100% at 18% 50%, #000 20%, transparent 72%);
  pointer-events: none;
}
.mode-icon-enter-active,
.mode-icon-leave-active {
  transition:
    scale 140ms cubic-bezier(0.2, 0, 0, 1),
    opacity 140ms cubic-bezier(0.2, 0, 0, 1),
    filter 140ms cubic-bezier(0.2, 0, 0, 1);
}
.mode-icon-enter-from,
.mode-icon-leave-to {
  scale: 0.25;
  opacity: 0;
  filter: blur(4px);
}
@media (prefers-reduced-motion: reduce) {
  .mode-icon-enter-active,
  .mode-icon-leave-active {
    transition: none;
  }
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
