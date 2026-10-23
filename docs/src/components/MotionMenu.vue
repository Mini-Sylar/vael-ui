<template>
  <Menu :items="items" @select="(item) => pick(item.value as MotionPreset)">
    <template #trigger>
      <Button
        variant="ghost"
        size="sm"
        icon
        :aria-label="t('motionDocs.presets.label')"
        v-tooltip="t('motionDocs.presets.label')"
      >
        <PhWaveSine :size="18" />
      </Button>
    </template>
    <template #header>
      <p class="motion-menu-head">{{ t('motionDocs.presets.label') }}</p>
    </template>
    <template #item="{ item }">
      <span class="motion-menu-item">
        <span class="motion-menu-text">
          <span>{{ item.label }}</span>
          <span class="motion-menu-description">{{ item.description }}</span>
        </span>
        <PhCheck
          v-if="item.value === preset"
          :size="14"
          class="motion-menu-check"
          aria-hidden="true"
        />
      </span>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhCheck, PhWaveSine } from '@phosphor-icons/vue'
import { Button, Menu, toast, vTooltip } from 'vael-ui'
import { MOTION_PRESETS } from '../motionPresets'
import type { MotionPreset } from '../motionPresets'

// The site's motion, from the header: every component on every page follows the preset.
const preset = defineModel<MotionPreset>({ required: true })
const { t } = useI18n()

const items = computed(() =>
  MOTION_PRESETS.map((id) => ({
    label: t(`motionDocs.presets.${id}.label`),
    value: id,
    description: t(`motionDocs.presets.${id}.body`),
  })),
)
// A toast, played in the new style, so you see the change at once.
function pick(next: MotionPreset) {
  preset.value = next
  requestAnimationFrame(() =>
    toast(t('motionDocs.presets.changed', { name: t(`motionDocs.presets.${next}.label`) })),
  )
}
</script>

<style scoped>
.motion-menu-head {
  margin: 0;
  padding: 0.5rem 0.75rem 0.25rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}
.motion-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  inline-size: 100%;
}
.motion-menu-text {
  display: grid;
  line-height: 1.3;
}
.motion-menu-description {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.motion-menu-check {
  margin-inline-start: auto;
  color: var(--ui-primary);
}
</style>
