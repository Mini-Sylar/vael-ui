<template>
  <section class="demo">
    <h3>Vertical volume: CSS and spring</h3>
    <p class="note">
      A phone-style volume control built on <code>orientation="vertical"</code>. The spring version
      follows the value on a <code>createSpring</code> and grows while you hold it. Drag past the
      top or bottom, and <code>v-animate</code> live values stretch it, then spring it back.
    </p>
    <div class="pair">
      <figure>
        <Slider
          v-model="cssVolume"
          orientation="vertical"
          class="volume volume-css"
          aria-label="Volume"
        >
          <template #track="{ percents }">
            <span class="volume-icon"><component :is="iconFor(cssVolume)" :size="22" /></span>
            <span
              class="volume-fill"
              :style="{ clipPath: clipTo(percents[0] ?? 0) }"
              aria-hidden="true"
            >
              <span class="volume-icon"><component :is="iconFor(cssVolume)" :size="22" /></span>
            </span>
          </template>
        </Slider>
        <figcaption>CSS</figcaption>
      </figure>
      <figure>
        <Slider
          ref="slider"
          v-model="volume"
          v-animate="{
            animate: {
              scaleX: { value: () => press() - give() * 0.4, spring: 'bouncy' },
              scaleY: { value: () => press() + give(), spring: 'bouncy' },
            },
          }"
          orientation="vertical"
          class="volume"
          :style="{ transformOrigin: stretch < 0 ? 'center top' : 'center bottom' }"
          aria-label="Volume"
        >
          <template #track>
            <span class="volume-icon"><component :is="iconFor(volume)" :size="22" /></span>
            <span ref="fill" class="volume-fill" aria-hidden="true">
              <span class="volume-icon"><component :is="iconFor(volume)" :size="22" /></span>
            </span>
          </template>
        </Slider>
        <figcaption>Spring</figcaption>
      </figure>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { PhSpeakerHigh, PhSpeakerLow, PhSpeakerSlash } from '@phosphor-icons/vue'
import { Slider } from 'vael-ui'
import { createSpring, vAnimate } from 'vael-ui/motion'

const volume = shallowRef(60)
const cssVolume = shallowRef(60)
const slider = useTemplateRef('slider')
const fill = useTemplateRef<HTMLElement>('fill')
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const iconFor = (value: number) =>
  value === 0 ? PhSpeakerSlash : value < 50 ? PhSpeakerLow : PhSpeakerHigh

const clipTo = (percent: number) => `inset(${100 - percent}% 0 0 0)`

// Held, it grows a little; dragged past an end, it gives, with less the farther it goes.
const stretch = shallowRef(0)
const press = () => (slider.value?.dragging && !reduced() ? 1.04 : 1)
const give = () => Math.abs(stretch.value)
const MAX_STRETCH = 0.1

const follow = createSpring(volume.value, { damping: 0.9, response: 0.25 }, (percent) => {
  if (fill.value) fill.value.style.clipPath = clipTo(percent)
})
onMounted(() => follow.jump(volume.value))
onScopeDispose(() => follow.destroy())
watch(volume, (next) => (reduced() ? follow.jump(next) : follow.set(next)))

useEventListener(window, 'pointermove', (event: PointerEvent) => {
  const track = slider.value?.trackEl
  if (!track || !slider.value?.dragging) return
  const rect = track.getBoundingClientRect()
  const raw = (rect.bottom - event.clientY) / rect.height
  const over = raw < 0 ? raw : raw > 1 ? raw - 1 : 0
  stretch.value = Math.sign(over) * MAX_STRETCH * (1 - 1 / (Math.abs(over) * 4 + 1))
})
watch(
  () => slider.value?.dragging,
  (dragging) => dragging || (stretch.value = 0),
)
</script>

<style scoped>
.pair {
  display: flex;
  gap: 3rem;
  padding-block: 1rem;
}
figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}
figcaption {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
.volume-css {
  transition: scale 200ms var(--ui-ease-out);
}
.volume-css[data-dragging] {
  scale: 1.04;
}
@media (prefers-reduced-motion: reduce) {
  .volume-css[data-dragging] {
    scale: 1;
  }
}
.volume {
  --ui-slider-thumb-size: 0px;
  --ui-slider-track: 4rem;
  inline-size: 4rem;
  block-size: 11rem;
}
.volume:has(:deep(.ui-slider-thumb[data-focus-visible])) :deep(.ui-slider-track) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 3px;
}
.volume :deep(.ui-slider-track) {
  overflow: hidden;
  border-radius: 1.25rem;
  background: var(--ui-muted);
}
.volume :deep(.ui-slider-fill) {
  display: none;
}
.volume :deep(.ui-slider-thumb) {
  inline-size: 100%;
  block-size: 1px;
  border: none;
  background: transparent;
  box-shadow: none;
  outline: none;
}
.volume-fill {
  position: absolute;
  inset: 0;
  background: var(--ui-text);
}
.volume-icon {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0.875rem;
  display: grid;
  place-items: center;
  color: var(--ui-text-muted);
  pointer-events: none;
}
.volume-fill .volume-icon {
  color: var(--ui-surface);
}
</style>
