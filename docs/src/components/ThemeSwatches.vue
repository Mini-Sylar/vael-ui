<template>
  <MotionConfig reduced-motion="user">
    <LazyMotion :features="domAnimation">
      <div
        ref="row"
        class="theme-swatches"
        role="radiogroup"
        :aria-label="t('theme.label')"
        :style="{ '--ring': ringColor }"
      >
        <m.span
          class="swatch-ring"
          aria-hidden="true"
          :initial="false"
          :animate="{ x: ringX }"
          :transition="GLIDE"
        />
        <m.button
          v-for="(preset, index) in PRESETS"
          :key="preset.key"
          type="button"
          role="radio"
          class="swatch"
          :class="{ 'swatch--default': preset.color === null }"
          :style="preset.color ? { '--swatch': preset.color } : undefined"
          :aria-checked="isSelected(preset.color)"
          :tabindex="index === tabStopIndex ? 0 : -1"
          :aria-label="t(`theme.${preset.key}`)"
          :title="t(`theme.${preset.key}`)"
          :while-hover="{ scale: 1.1 }"
          :while-press="{ scale: 0.88 }"
          :transition="PRESS"
          @click="primaryColor = preset.color"
          @keydown="onKeydown($event, index)"
        />
        <m.label
          class="swatch swatch--custom"
          :class="{ 'swatch--custom-active': isCustom }"
          :style="isCustom ? { '--swatch': primaryColor! } : undefined"
          :title="t('theme.custom')"
          tabindex="-1"
          :while-hover="{ scale: 1.1 }"
          :while-press="{ scale: 0.88 }"
          :transition="PRESS"
        >
          <input
            type="color"
            class="swatch-input"
            :value="primaryColor ?? '#2563eb'"
            :aria-label="t('theme.custom')"
            @input="primaryColor = ($event.target as HTMLInputElement).value"
          />
        </m.label>
      </div>
    </LazyMotion>
  </MotionConfig>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { LazyMotion, MotionConfig, domAnimation, m } from 'motion-v'
import { primaryColor } from '../preferences'

const { t } = useI18n()

// `null` is the library's own black/white palette.
const PRESETS = [
  { key: 'default', color: null },
  { key: 'blue', color: '#2563eb' },
  { key: 'violet', color: '#7c3aed' },
  { key: 'rose', color: '#e11d48' },
  { key: 'orange', color: '#ea580c' },
  { key: 'green', color: '#16a34a' },
] as const

// Critically damped (no overshoot) for the ring gliding between swatches: it
// follows a tap, not a flick, so bounce would read as noise. Press feedback
// is quicker still, so it lands under the finger.
const GLIDE = { type: 'spring', bounce: 0, duration: 0.35 } as const
const PRESS = { type: 'spring', bounce: 0, duration: 0.2 } as const

function isSelected(color: string | null): boolean {
  return (primaryColor.value?.toLowerCase() ?? null) === color
}

const isCustom = computed(
  () => primaryColor.value !== null && !PRESETS.some((preset) => isSelected(preset.color)),
)

// The custom swatch sits in the slot after the presets.
const selectedIndex = computed(() =>
  isCustom.value ? PRESETS.length : PRESETS.findIndex((preset) => isSelected(preset.color)),
)

// Roving tabindex: the checked preset is the group's one Tab stop, or the
// first preset while a custom color is active.
const tabStopIndex = computed(() => (isCustom.value ? 0 : selectedIndex.value))

function onKeydown(event: KeyboardEvent, index: number) {
  const last = PRESETS.length - 1
  let next: number
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = index === last ? 0 : index + 1
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      next = index === 0 ? last : index - 1
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = last
      break
    default:
      return
  }
  event.preventDefault()
  primaryColor.value = PRESETS[next]!.color
  row.value?.querySelectorAll<HTMLElement>('button.swatch')[next]?.focus()
}

const ringColor = computed(() => primaryColor.value ?? 'var(--ui-text)')

// The ring's x is the selected swatch's measured offset, in px. Motion reads
// the element's current position back in px, so animating in rem would jump
// on the first change; measuring also keeps the ring aligned when the docs'
// font-size setting or the layout changes (re-measured on resize).
const row = useTemplateRef<HTMLElement>('row')
const ringX = shallowRef(0)
function measureRing() {
  const swatch = row.value?.querySelectorAll<HTMLElement>('.swatch')[selectedIndex.value]
  if (swatch) ringX.value = swatch.offsetLeft
}
watch(selectedIndex, measureRing, { flush: 'post' })
onMounted(measureRing)
useResizeObserver(row, measureRing)
</script>

<style scoped>
.theme-swatches {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.swatch {
  position: relative;
  display: inline-block;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--swatch);
  cursor: pointer;
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--ui-text) 12%, transparent);
}

/* One ring for the whole row, gliding to the selected slot and taking its
   color. Sits just outside the swatch. */
.swatch-ring {
  position: absolute;
  inset-inline-start: -4px;
  inline-size: calc(1.5rem + 8px);
  block-size: calc(1.5rem + 8px);
  border: 2px solid var(--ring);
  border-radius: 50%;
  pointer-events: none;
  transition: border-color var(--ui-duration-press) var(--ui-ease-out);
}

.swatch:focus-visible,
.swatch--custom:has(.swatch-input:focus-visible) {
  outline: 2px solid var(--ui-text);
  outline-offset: 5px;
}

/* The default is the monochrome palette, so it shows both of its ends. */
.swatch--default {
  background: linear-gradient(135deg, #18181b 50%, #fafafa 50%);
}

/* Custom: a color wheel until a custom color is picked, then that color. */
.swatch--custom {
  background: conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444);
}

.swatch--custom-active {
  background: var(--swatch);
}

.swatch-input {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  opacity: 0;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .swatch-ring {
    transition: none;
  }
}
</style>
