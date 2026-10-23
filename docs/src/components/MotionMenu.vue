<template>
  <Popover v-model:open="open" side="bottom" align="end">
    <template #trigger="{ setTriggerEl }">
      <Button
        :ref="setTriggerEl"
        variant="ghost"
        size="sm"
        icon
        class="motion-menu-trigger"
        :aria-label="t('motionDocs.presets.label')"
        v-tooltip="t('motionDocs.presets.label')"
        @click="open = !open"
      >
        <PhWaveSine ref="wave" :size="18" />
        <!-- New in this release: a dot until you've looked inside once. -->
        <span v-if="!seen" class="motion-menu-dot" aria-hidden="true" />
      </Button>
    </template>
    <div class="motion-menu">
      <div class="motion-menu-head">
        <span :id="labelId">{{ t('motionDocs.presets.label') }}</span>
        <button type="button" class="motion-menu-link" @click="startTour">
          {{ t('motionDocs.tour.cta') }}
        </button>
      </div>
      <RadioGroup
        :model-value="preset"
        class="motion-menu-presets"
        :aria-labelledby="labelId"
        @update:model-value="(id) => pick(id as MotionPreset)"
      >
        <Radio
          v-for="id in MOTION_PRESETS"
          :key="id"
          :value="id"
          :label="t(`motionDocs.presets.${id}.label`)"
          :description="t(`motionDocs.presets.${id}.body`)"
        />
      </RadioGroup>
      <!-- Your own take on the picked preset: every component follows as you drag. -->
      <section class="motion-menu-tune">
        <div class="motion-menu-head">
          <span>{{
            t('motionDocs.presets.tune', { name: t(`motionDocs.presets.${preset}.label`) })
          }}</span>
          <button v-if="tune" type="button" class="motion-menu-link" @click="tune = null">
            {{ t('motionDocs.presets.reset') }}
          </button>
        </div>
        <label v-for="dial in DIALS" :key="dial.key" class="motion-menu-dial">
          <span>
            {{ t(`motionDocs.presets.dial.${dial.key}`) }}
            <output>{{ dial.show(dial.read(dials)) }}</output>
          </span>
          <Slider
            :model-value="dial.read(dials)"
            :min="dial.min"
            :max="dial.max"
            :step="dial.step"
            :aria-label="t(`motionDocs.presets.dial.${dial.key}`)"
            @update:model-value="(value) => (tune = { ...dials, ...dial.write(value as number) })"
          />
        </label>
      </section>
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { PhWaveSine } from '@phosphor-icons/vue'
import { Button, Popover, Radio, RadioGroup, Slider, toast, vTooltip } from 'vael-ui'
import { MOTION_PRESETS, tuneOf } from '../motionPresets'
import type { MotionPreset, MotionTune } from '../motionPresets'

// The site's motion, from the header: every component on every page follows the preset, and
// your tune of it.
const preset = defineModel<MotionPreset>({ required: true })
const tune = defineModel<MotionTune | null>('tune', { default: null })
const emit = defineEmits<{ tour: [] }>()
const { t } = useI18n()
const labelId = useId()
const open = shallowRef(false)
const seen = useLocalStorage('vael-ui-docs-motion-seen', false)
watch(open, (now) => now && (seen.value = true))
function startTour() {
  open.value = false
  emit('tour')
}

// Each dial reads the way it's named: further right is longer, bouncier, deeper.
const DIALS = [
  {
    key: 'response',
    min: 0.12,
    max: 0.8,
    step: 0.02,
    read: (m: MotionTune) => m.response,
    write: (v: number) => ({ response: v }),
    show: (v: number) => `${v.toFixed(2)}s`,
  },
  {
    key: 'damping',
    min: 0,
    max: 0.8,
    step: 0.05,
    read: (m: MotionTune) => Math.max(0, 1 - m.damping),
    write: (v: number) => ({ damping: 1 - v }),
    show: (v: number) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'press',
    min: 0,
    max: 0.15,
    step: 0.01,
    read: (m: MotionTune) => 1 - m.press,
    write: (v: number) => ({ press: Math.round((1 - v) * 100) / 100 }),
    show: (v: number) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'stagger',
    min: 0,
    max: 0.1,
    step: 0.005,
    read: (m: MotionTune) => m.stagger,
    write: (v: number) => ({ stagger: v }),
    show: (v: number) => `${Math.round(v * 1000)}ms`,
  },
] as const
const dials = computed(() => tune.value ?? tuneOf(preset.value))

// A toast, played in the new style, so you see the change at once.
const wave = useTemplateRef<{ $el: SVGElement }>('wave')
function pick(next: MotionPreset) {
  preset.value = next
  tune.value = null
  // The icon gives a small hop: the site's motion just changed.
  wave.value?.$el?.animate?.([{ scale: '1' }, { scale: '1.3', rotate: '-8deg' }, { scale: '1' }], {
    duration: 320,
    easing: 'cubic-bezier(0.34, 1.36, 0.64, 1)',
  })
  requestAnimationFrame(() =>
    toast(t('motionDocs.presets.changed', { name: t(`motionDocs.presets.${next}.label`) })),
  )
}
</script>

<style scoped>
.motion-menu {
  display: grid;
  gap: 0.75rem;
  inline-size: 17rem;
  padding: 0.75rem;
}
.motion-menu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}
.motion-menu-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ui-primary);
  font: inherit;
  cursor: pointer;
}
.motion-menu-presets {
  gap: 0.5rem;
}
.motion-menu-tune {
  display: grid;
  gap: 0.6rem;
  padding-block-start: 0.75rem;
  border-block-start: 1px solid var(--ui-border);
}
.motion-menu-dial {
  display: grid;
  gap: 0.3rem;
  font-size: 0.8125rem;
}
.motion-menu-dial > span {
  display: flex;
  justify-content: space-between;
}
.motion-menu-dial output {
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}
.motion-menu-trigger {
  position: relative;
}
.motion-menu-dot {
  position: absolute;
  inset-block-start: 0.2rem;
  inset-inline-end: 0.2rem;
  inline-size: 0.4rem;
  block-size: 0.4rem;
  border-radius: 50%;
  background: var(--ui-info);
  box-shadow: 0 0 0 2px var(--ui-surface);
}
</style>
