<template>
  <section class="demo">
    <h3>Fluid slider: CSS and spring</h3>
    <p class="note">
      The same slider twice. The first draws its fill from the <code>#track</code> slot's
      <code>percents</code>. The second follows the value on a <code>createSpring</code>, and
      <code>v-animate</code> live values link its size to the exposed <code>dragging</code> and the
      overdrag: it grows while you hold it and stretches with resistance past either end.
    </p>
    <div class="pair">
      <figure>
        <Slider v-model="cssValue" class="fluid-slider fluid-css" aria-label="Brightness">
          <template #track="{ percents }">
            <span class="fluid-label"><span>Brightness</span><span>{{ cssValue }}%</span></span>
            <span
              class="fluid-fill"
              :style="{ clipPath: clipTo(percents[0] ?? 0) }"
              aria-hidden="true"
            >
              <span class="fluid-label"><span>Brightness</span><span>{{ cssValue }}%</span></span>
            </span>
          </template>
        </Slider>
        <figcaption>CSS</figcaption>
      </figure>
      <figure>
        <Slider
          ref="slider"
          v-model="value"
          v-animate="{
            animate: {
              scaleX: { value: () => press() * (1 + Math.abs(stretch)), spring: 'bouncy' },
              scaleY: { value: () => press() * (1 - Math.abs(stretch) * 0.4), spring: 'bouncy' },
            },
          }"
          class="fluid-slider"
          :style="{ transformOrigin: stretch < 0 ? 'right center' : 'left center' }"
          aria-label="Brightness"
        >
          <template #track>
            <span class="fluid-label"><span>Brightness</span><span>{{ value }}%</span></span>
            <span ref="fill" class="fluid-fill" aria-hidden="true">
              <span class="fluid-label"><span>Brightness</span><span>{{ value }}%</span></span>
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
import { Slider } from 'vael-ui'
import { createSpring, vAnimate } from 'vael-ui/motion'

const value = shallowRef(45)
const cssValue = shallowRef(45)
const slider = useTemplateRef('slider')
const fill = useTemplateRef<HTMLElement>('fill')
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const clipTo = (percent: number) => `inset(0 ${100 - percent}% 0 0 round 9999px)`

// How far past either end the pointer is, as a share of the track: signed, and rubber-banded.
const stretch = shallowRef(0)
const press = () => (slider.value?.dragging && !reduced() ? 1.03 : 1)
const MAX_STRETCH = 0.08

const follow = createSpring(value.value, { damping: 0.85, response: 0.22 }, (percent) => {
  if (fill.value) fill.value.style.clipPath = clipTo(percent)
})
onMounted(() => follow.jump(value.value))
onScopeDispose(() => follow.destroy())
watch(value, (next) => (reduced() ? follow.jump(next) : follow.set(next)))

useEventListener(window, 'pointermove', (event: PointerEvent) => {
  const track = slider.value?.trackEl
  if (!track || !slider.value?.dragging) return
  const rect = track.getBoundingClientRect()
  const raw = (event.clientX - rect.left) / rect.width
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.5rem 2rem;
  max-inline-size: 42rem;
}
figure {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}
figcaption {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
.fluid-css {
  transition: scale 200ms var(--ui-ease-out);
}
.fluid-css[data-dragging] {
  scale: 1.03;
}
@media (prefers-reduced-motion: reduce) {
  .fluid-css[data-dragging] {
    scale: 1;
  }
}
.fluid-slider {
  --ui-slider-thumb-size: 0px;
  --ui-slider-track: 3rem;
}
.fluid-slider:has(:deep(.ui-slider-thumb[data-focus-visible])) :deep(.ui-slider-track) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
.fluid-slider :deep(.ui-slider-track) {
  overflow: hidden;
  background: var(--ui-muted);
}
.fluid-slider :deep(.ui-slider-fill) {
  display: none;
}
.fluid-slider :deep(.ui-slider-thumb) {
  inline-size: 1px;
  block-size: 100%;
  border: none;
  background: transparent;
  box-shadow: none;
  outline: none;
}
.fluid-fill {
  position: absolute;
  inset: 0;
  background: var(--ui-text);
}
.fluid-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text);
  pointer-events: none;
}
.fluid-fill .fluid-label {
  color: var(--ui-surface);
}
</style>
